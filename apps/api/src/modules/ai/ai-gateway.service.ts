import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';
import type {
  AiCapability,
  AiMessage,
  AiProvider,
  AiProviderName,
  AiResponse,
  AiTool,
} from './providers/ai-provider.interface.js';
import { ModelRouterService } from './routing/model-router.service.js';
import { FallbackPolicyService } from './routing/fallback-policy.service.js';
import { CapabilityRegistry } from './routing/capability-registry.js';
import { TokenCounterService } from './usage/token-counter.service.js';
import { CostCalculatorService } from './usage/cost-calculator.service.js';
import { AiUsageRepository } from './usage/ai-usage.repository.js';
import { ModerationService } from './safety/moderation.service.js';
import { PiiRedactionService } from './safety/pii-redaction.service.js';
import { PromptInjectionDetector } from './safety/prompt-injection-detector.js';
import { AiCacheService } from './cache/ai-cache.service.js';
import { AiSafetyService } from './safety/ai-safety.service.js';
import { AiObservabilityService } from './observability/ai-observability.service.js';
export interface AiGatewayCommand {
  requestId?: string;
  correlationId: string;
  workspaceId: string;
  userId: string;
  feature: string;
  messages: AiMessage[];
  capabilities?: AiCapability[];
  preferredModel?: string;
  allowedProviders?: AiProviderName[];
  maxTokens: number;
  maxCostUsd: number;
  temperature?: number;
  jsonSchema?: Record<string, unknown>;
  tools?: AiTool[];
  dataClassification?: 'public' | 'internal' | 'confidential' | 'restricted';
  signal?: AbortSignal;
  cacheable?: boolean;
}
export interface AiEmbeddingCommand {
  requestId?: string;
  correlationId: string;
  workspaceId: string;
  userId: string;
  inputs: string[];
  preferredModel?: string;
  allowedProviders?: AiProviderName[];
  maxCostUsd: number;
  signal?: AbortSignal;
}
@Injectable()
export class AiGatewayService {
  private readonly providers = new Map<AiProviderName, AiProvider>();
  constructor(
    private readonly config: ConfigService,
    private readonly router: ModelRouterService,
    private readonly fallback: FallbackPolicyService,
    private readonly capabilities: CapabilityRegistry,
    private readonly tokens: TokenCounterService,
    private readonly costs: CostCalculatorService,
    private readonly usage: AiUsageRepository,
    private readonly moderation: ModerationService,
    private readonly pii: PiiRedactionService,
    private readonly injection: PromptInjectionDetector,
    private readonly cache: AiCacheService,
    @Optional() private readonly advancedSafety?: AiSafetyService,
    @Optional() private readonly observability?: AiObservabilityService,
  ) {}
  register(provider: AiProvider) {
    this.providers.set(provider.name, provider);
  }
  async embed(command: AiEmbeddingCommand) {
    if (!command.inputs.length || command.inputs.length > 128) throw new BadRequestException('Embedding batch size is invalid');
    const allowed = command.allowedProviders ?? this.config.get<AiProviderName[]>('ai.allowedProviders') ?? ['ollama'];
    const model = this.router.route({ capabilities: ['embeddings'], allowedProviders: allowed, ...(command.preferredModel ? { preferredModel: command.preferredModel } : {}) });
    const provider = this.providers.get(model.provider);
    if (!provider) throw new ServiceUnavailableException('Embedding provider is unavailable');
    const inputTokens = command.inputs.reduce((sum, value) => sum + this.tokens.countMessages([{ role: 'user', content: value }]), 0);
    const estimate = this.costs.estimate(model, inputTokens, 0);
    if (estimate > command.maxCostUsd) throw new ForbiddenException('Maximum AI execution cost exceeded');
    const requestId = command.requestId ?? randomUUID();
    const result = await provider.embed({ requestId, correlationId: command.correlationId, workspaceId: command.workspaceId, feature: 'rag', model: model.model, inputs: command.inputs, maxTokens: 0, ...(command.signal ? { signal: command.signal } : {}) });
    await this.usage.record({ requestId, correlationId: command.correlationId, workspaceId: new Types.ObjectId(command.workspaceId), userId: command.userId, feature: 'rag_embeddings', provider: provider.name, model: model.model, inputTokens: result.usage.inputTokens, outputTokens: 0, costUsd: this.costs.actual(model, result.usage), promptHash: this.cache.key(command.inputs), dataClassification: 'confidential' });
    return { ...result, provider: provider.name, model: model.model };
  }
  async execute(command: AiGatewayCommand): Promise<AiResponse> {
    const startedAt = Date.now(), requestId = command.requestId ?? randomUUID(),
      allowed = command.allowedProviders ??
        this.config.get<AiProviderName[]>('ai.allowedProviders') ?? ['ollama'];
    if (command.signal?.aborted) throw command.signal.reason;
    const raw = command.messages.map((m) => m.content).join('\n');
    const safety = await this.advancedSafety?.preprocess({ workspaceId: command.workspaceId, requestId, content: raw, feature: command.feature });
    await this.observability?.start({ requestId, correlationId: command.correlationId, workspaceId: command.workspaceId, feature: command.feature, ...(safety?.retentionDays ? { retainedPrompt: safety.content, deleteAfter: new Date(Date.now() + safety.retentionDays * 86_400_000) } : {}) });
    this.moderation.assertSafe(raw);
    if (this.injection.detect(raw).detected && command.feature === 'rag')
      throw new BadRequestException('Prompt injection detected in retrieved context');
    const messages =
      command.dataClassification === 'restricted'
        ? command.messages.map((m) => ({ ...m, content: this.pii.redact(m.content) }))
        : command.messages;
    const inputTokens = this.tokens.countMessages(messages),
      required = [
        ...(command.capabilities ?? ['chat']),
        ...(command.jsonSchema ? ['json' as const] : []),
        ...(command.tools?.length ? ['tools' as const] : []),
      ];
    const model = this.router.route({
      capabilities: [...new Set(required)],
      allowedProviders: allowed,
      ...(command.preferredModel ? { preferredModel: command.preferredModel } : {}),
    });
    if (
      inputTokens + command.maxTokens > model.contextTokens ||
      command.maxTokens > model.maxOutputTokens
    )
      throw new BadRequestException('AI token limit exceeded');
    const estimate = this.costs.estimate(model, inputTokens, command.maxTokens);
    if (estimate > command.maxCostUsd)
      throw new ForbiddenException('Maximum AI execution cost exceeded');
    const month = new Date();
    month.setUTCDate(1);
    month.setUTCHours(0, 0, 0, 0);
    const used = await this.usage.used(command.workspaceId, month),
      tokenQuota = this.config.get<number>('ai.monthlyTokenQuota') ?? 1_000_000,
      costQuota = this.config.get<number>('ai.monthlyCostQuotaUsd') ?? 100;
    if (
      used.tokens + inputTokens + command.maxTokens > tokenQuota ||
      used.cost + estimate > costQuota
    )
      throw new ForbiddenException('Workspace AI quota exceeded');
    const request = { ...command, requestId, model: model.model, messages };
    const cacheKey =
      command.cacheable && command.temperature === 0 && !command.tools?.length
        ? this.cache.key({
            workspaceId: command.workspaceId,
            model: model.model,
            messages,
            jsonSchema: command.jsonSchema,
          })
        : null;
    if (cacheKey) {
      const hit = await this.cache.get(cacheKey);
      if (hit) {
        await this.observability?.finish(requestId, { latencyMs: Date.now() - startedAt, inputTokens: hit.usage.inputTokens, outputTokens: hit.usage.outputTokens, cacheHit: true, safetyInterventions: safety?.interventions ?? [], status: 'completed' });
        return hit;
      }
    }
    const ordered = [model.provider, ...allowed.filter((v) => v !== model.provider)]
      .map((v) => this.providers.get(v))
      .filter((v): v is AiProvider => Boolean(v));
    if (!ordered.length)
      throw new ServiceUnavailableException('No configured AI provider is available');
    let result: Awaited<ReturnType<FallbackPolicyService['execute']>>;
    try {
      result = await this.fallback.execute(ordered, request);
    } catch (error) {
      await this.observability?.finish(requestId, { model: model.model, latencyMs: Date.now() - startedAt, status: 'failed', errorCode: error instanceof Error ? error.name : 'provider_failure' });
      throw error;
    }
    const actualCost = this.costs.actual(model, result.response.usage);
    let response = result.response;
    if (command.jsonSchema) {
      try {
        const structured = JSON.parse(response.content) as unknown;
        this.validateStructured(structured, command.jsonSchema);
        response = { ...response, structured };
      } catch {
        throw new BadRequestException('AI provider returned invalid structured output');
      }
    }
    this.moderation.assertSafe(response.content);
    if (this.advancedSafety) {
      try {
        response = { ...response, content: await this.advancedSafety.postprocess({ workspaceId: command.workspaceId, requestId, content: response.content }) };
      } catch (error) {
        await this.observability?.finish(requestId, { provider: result.provider.name, model: model.model, latencyMs: Date.now() - startedAt, inputTokens: response.usage.inputTokens, outputTokens: response.usage.outputTokens, status: 'blocked', errorCode: 'output_safety_block' });
        throw error;
      }
    }
    await this.usage.record({
      requestId,
      correlationId: command.correlationId,
      workspaceId: new Types.ObjectId(command.workspaceId),
      userId: command.userId,
      feature: command.feature,
      provider: result.provider.name,
      model: model.model,
      inputTokens: response.usage.inputTokens,
      outputTokens: response.usage.outputTokens,
      costUsd: actualCost,
      promptHash: this.cache.key(messages),
      dataClassification: command.dataClassification ?? 'internal',
    });
    if (cacheKey) await this.cache.set(cacheKey, response);
    await this.observability?.finish(requestId, { provider: result.provider.name, model: model.model, latencyMs: Date.now() - startedAt, inputTokens: response.usage.inputTokens, outputTokens: response.usage.outputTokens, costUsd: actualCost, retries: result.retries, fallbackUsed: result.fallbackUsed, cacheHit: false, toolCalls: response.toolCalls?.map((tool) => tool.name) ?? [], safetyInterventions: safety?.interventions ?? [], status: 'completed' });
    return response;
  }
  private validateStructured(value: unknown, schema: Record<string, unknown>) {
    if (
      schema.type === 'object' &&
      (typeof value !== 'object' || value === null || Array.isArray(value))
    )
      throw new Error('Expected object');
    for (const key of (schema.required as string[]) ?? [])
      if (!(key in (value as Record<string, unknown>))) throw new Error(`Missing ${key}`);
  }
}
