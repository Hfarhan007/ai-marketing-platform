import { randomUUID } from 'node:crypto';
import { Inject, Injectable, HttpException, HttpStatus, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../../../cache/redis.constants.js';
import { AiUsageRepository } from '../usage/ai-usage.repository.js';

export interface ReliabilityAdmission {
  workspaceId: string;
  feature: string;
  agentId?: string | null;
  estimatedTokens: number;
  estimatedCostUsd: number;
}
export interface ReliabilityReservation { id: string; key: string; estimatedTokens: number; estimatedCostUsd: number; warning: boolean }

@Injectable()
export class AiReliabilityService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis, private readonly config: ConfigService, private readonly usage: AiUsageRepository) {}

  async reserve(input: ReliabilityAdmission): Promise<ReliabilityReservation> {
    const now = new Date(), day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())), month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const [daily, monthly, feature, agent] = await Promise.all([
      this.usage.used(input.workspaceId, day), this.usage.used(input.workspaceId, month), this.usage.usedFeature(input.workspaceId, input.feature, month),
      input.agentId ? this.usage.usedAgent(input.workspaceId, input.agentId, month) : Promise.resolve({ tokens: 0, cost: 0 }),
    ]);
    const limits = {
      tokens: this.config.get<number>('ai.monthlyTokenQuota') ?? 1_000_000,
      daily: this.config.get<number>('ai.dailyCostLimitUsd') ?? 20,
      monthly: this.config.get<number>('ai.monthlyCostQuotaUsd') ?? 100,
      feature: this.config.get<number>(`ai.featureQuotas.${input.feature}.costUsd`) ?? Number.POSITIVE_INFINITY,
      agent: input.agentId ? this.config.get<number>(`ai.agentBudgets.${input.agentId}.costUsd`) ?? this.config.get<number>('ai.defaultAgentBudgetUsd') ?? Number.POSITIVE_INFINITY : Number.POSITIVE_INFINITY,
      concurrency: this.config.get<number>('ai.workspaceConcurrency') ?? 10,
      soft: this.config.get<number>('ai.softLimitRatio') ?? 0.8,
    };
    if (monthly.tokens + input.estimatedTokens > limits.tokens || daily.cost + input.estimatedCostUsd > limits.daily || monthly.cost + input.estimatedCostUsd > limits.monthly || feature.cost + input.estimatedCostUsd > limits.feature || agent.cost + input.estimatedCostUsd > limits.agent) throw new ForbiddenException('AI hard budget limit exceeded');
    const key = `ai:reliability:${input.workspaceId}`, id = randomUUID();
    const remainingCost = Math.min(limits.daily - daily.cost, limits.monthly - monthly.cost, limits.feature - feature.cost, limits.agent - agent.cost), remainingTokens = limits.tokens - monthly.tokens;
    const result = await this.redis.eval(
      "local c=tonumber(redis.call('HGET',KEYS[1],'concurrency') or '0'); local rc=tonumber(redis.call('HGET',KEYS[1],'reservedCost') or '0'); local rt=tonumber(redis.call('HGET',KEYS[1],'reservedTokens') or '0'); if c>=tonumber(ARGV[1]) then return 0 end; if rc+tonumber(ARGV[2])>tonumber(ARGV[5]) or rt+tonumber(ARGV[3])>tonumber(ARGV[6]) then return -1 end; redis.call('HINCRBY',KEYS[1],'concurrency',1); redis.call('HINCRBYFLOAT',KEYS[1],'reservedCost',ARGV[2]); redis.call('HINCRBY',KEYS[1],'reservedTokens',ARGV[3]); redis.call('HSET',KEYS[2],'cost',ARGV[2],'tokens',ARGV[3]); redis.call('EXPIRE',KEYS[1],ARGV[4]); redis.call('EXPIRE',KEYS[2],ARGV[4]); return 1",
      2, key, `${key}:reservation:${id}`, String(limits.concurrency), String(input.estimatedCostUsd), String(input.estimatedTokens), '300', String(remainingCost), String(remainingTokens),
    );
    if (Number(result) === -1) throw new ForbiddenException('AI hard budget limit exceeded by active reservations');
    if (Number(result) !== 1) throw new HttpException('Workspace AI concurrency limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
    const ratio = Math.max((monthly.tokens + input.estimatedTokens) / limits.tokens, (daily.cost + input.estimatedCostUsd) / limits.daily, (monthly.cost + input.estimatedCostUsd) / limits.monthly);
    return { id, key, estimatedTokens: input.estimatedTokens, estimatedCostUsd: input.estimatedCostUsd, warning: ratio >= limits.soft };
  }

  async reconcile(reservation: ReliabilityReservation, actual: { tokens: number; costUsd: number }) {
    await this.redis.eval("local c=tonumber(redis.call('HGET',KEYS[1],'concurrency') or '0'); if c>0 then redis.call('HINCRBY',KEYS[1],'concurrency',-1) end; redis.call('HINCRBYFLOAT',KEYS[1],'reservedCost',-tonumber(ARGV[1])); redis.call('HINCRBY',KEYS[1],'reservedTokens',-tonumber(ARGV[2])); redis.call('DEL',KEYS[2]); return 1", 2, reservation.key, `${reservation.key}:reservation:${reservation.id}`, String(reservation.estimatedCostUsd), String(reservation.estimatedTokens));
    return { reservedCostUsd: reservation.estimatedCostUsd, actualCostUsd: actual.costUsd, reservedTokens: reservation.estimatedTokens, actualTokens: actual.tokens };
  }
  release(reservation: ReliabilityReservation) { return this.reconcile(reservation, { tokens: 0, costUsd: 0 }); }
}
