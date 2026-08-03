import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AiProviderName } from '../providers/ai-provider.interface.js';
import { AiUsageRepository } from '../usage/ai-usage.repository.js';
import { AiGovernanceRepository } from '../repositories/ai-governance.repository.js';
@Injectable()
export class WorkspaceAiPolicyResolver {
  constructor(private readonly config: ConfigService, private readonly usage: AiUsageRepository, private readonly governance: AiGovernanceRepository) {}
  async resolve(workspaceId: string, feature: string) {
    const month = new Date(); month.setUTCDate(1); month.setUTCHours(0, 0, 0, 0);
    const [used, workspacePolicy] = await Promise.all([this.usage.usedFeature(workspaceId, feature, month), this.governance.policy(workspaceId)]);
    const featurePolicy = workspacePolicy?.featureQuotas?.[feature];
    const featureTokenQuota = featurePolicy?.tokens ?? this.config.get<number>(`ai.featureQuotas.${feature}.tokens`) ?? this.config.get<number>('ai.monthlyTokenQuota') ?? 1_000_000;
    const featureCostQuota = featurePolicy?.costUsd ?? this.config.get<number>(`ai.featureQuotas.${feature}.costUsd`) ?? this.config.get<number>('ai.monthlyCostQuotaUsd') ?? 100;
    if (used.tokens >= featureTokenQuota || used.cost >= featureCostQuota) throw new ForbiddenException('Workspace feature AI quota exceeded');
    const configured = this.config.get<AiProviderName[]>('ai.allowedProviders') ?? ['ollama'];
    const allowedProviders = workspacePolicy?.allowedProviders?.length ? configured.filter((provider) => workspacePolicy.allowedProviders.includes(provider)) : configured;
    return { allowedProviders, remainingTokens: featureTokenQuota - used.tokens, remainingCostUsd: Math.min(featureCostQuota - used.cost, workspacePolicy?.maximumExecutionCostUsd ?? Number.POSITIVE_INFINITY), routingPolicy: workspacePolicy?.featureRoutingPolicies?.[feature] ?? {} };
  }
}
