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
import { WorkspaceAiPolicyResolver } from './control-plane/workspace-ai-policy-resolver.service.js';
import type { ModelRoutingRequest } from './routing/model-router.service.js';
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
  maxInputTokens?: number;
  maxCostUsd: number;
  temperature?: number;
  jsonSchema?: Record<string, unknown>;
  tools?: AiTool[];
  dataClassification?: 'public' | 'internal' | 'confidential' | 'restricted';
  signal?: AbortSignal;
  cacheable?: boolean;
  executionContext?: { agentId: string | null; purpose: string; promptVersion: string | null; knowledgeScope: string[]; permittedTools: string[]; retentionPolicy: { retainPrompt: boolean; days: number }; budget: { maxCostUsd: number; maxOutputTokens: number }; deadline: Date };
  routingPolicy?: Omit<ModelRoutingRequest, 'capabilities' | 'allowedProviders' | 'preferredModel' | 'maxCostPerMillion'> & { timeoutMs?: number; retries?: number; hedgedSafe?: boolean; hedgeDelayMs?: number };
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
  routingPolicy?: AiGatewayCommand['routingPolicy'];
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
    @Optional() private readonly workspacePolicy?: WorkspaceAiPolicyResolver,
  ) {}
  register(provider: AiProvider) {
    this.providers.set(provider.name, provider);
  }
  async embed(command: AiEmbeddingCommand) {
    if (!command.inputs.length || command.inputs.length > 128) throw new BadRequestException('Embedding batch size is invalid');
    const policy = await this.workspacePolicy?.resolve(command.workspaceId, 'rag_embeddings');
    const allowed = command.allowedProviders?.filter((provider) => !policy || policy.allowedProviders.includes(provider)) ?? policy?.allowedProviders ?? this.config.get<AiProviderName[]>('ai.allowedProviders') ?? ['ollama'];
    const inputTokens = command.inputs.reduce((sum, value) => sum + this.tokens.countMessages([{ role: 'user', content: value }]), 0);
    const routing = this.router.decide({ capabilities: ['embeddings'], allowedProviders: allowed, minimumContextTokens: inputTokens, ...(command.preferredModel ? { preferredModel: command.preferredModel } : {}), ...(command.routingPolicy ?? {}) });
    const model = routing.primary;
    const estimate = this.costs.estimate(model, inputTokens, 0);
    if (estimate > Math.min(command.maxCostUsd, policy?.remainingCostUsd ?? Number.POSITIVE_INFINITY) || inputTokens > (policy?.remainingTokens ?? Number.POSITIVE_INFINITY)) throw new ForbiddenException('Maximum AI execution cost or feature quota exceeded');
    const requestId = command.requestId ?? randomUUID();
    const routes = [routing.primary, ...routing.fallbackChain].map((candidate) => ({ provider: this.providers.get(candidate.provider), model: candidate.model })).filter((value): value is { provider: AiProvider; model: string } => Boolean(value.provider));
    if (!routes.length) throw new ServiceUnavailableException('Embedding provider is unavailable');
    const result = await this.fallback.executeEmbedding(routes, { requestId, correlationId: command.correlationId, workspaceId: command.workspaceId, feature: 'rag', model: model.model, inputs: command.inputs, maxTokens: 0, ...(command.signal ? { signal: command.signal } : {}) }, { retries: command.routingPolicy?.retries ?? 2, ...(command.routingPolicy?.timeoutMs === undefined ? {} : { timeoutMs: command.routingPolicy.timeoutMs }) });
    const actualModel = this.capabilities.get(result.provider.name, result.model) ?? model;
    await this.usage.record({ requestId, correlationId: command.correlationId, workspaceId: new Types.ObjectId(command.workspaceId), userId: command.userId, feature: 'rag_embeddings', provider: result.provider.name, model: result.model, inputTokens: result.usage.inputTokens, outputTokens: 0, costUsd: this.costs.actual(actualModel, result.usage), promptHash: this.cache.key(command.inputs), promptVersion: `embedding:${result.model}`, dataClassification: 'confidential', selectionReason: routing.selectionReason, fallbackReason: result.fallbackReason });
    return { vectors: result.vectors, usage: result.usage, provider: result.provider.name, model: result.model };
  }
  async execute(command: AiGatewayCommand): Promise<AiResponse> {
    const startedAt = Date.now(), requestId = command.requestId ?? randomUUID(), featurePolicy = await this.workspacePolicy?.resolve(command.workspaceId, command.feature),
      allowed = command.allowedProviders?.filter((provider) => !featurePolicy || featurePolicy.allowedProviders.includes(provider)) ?? featurePolicy?.allowedProviders ?? this.config.get<AiProviderName[]>('ai.allowedProviders') ?? ['ollama'];
    if (command.signal?.aborted) throw command.signal.reason;
    const raw = command.messages.map((m) => m.content).join('\n');
    const effectivePromptVersion = command.executionContext?.promptVersion ?? `inline:${this.cache.key(raw).split(':').at(-1)}`;
    const safety = await this.advancedSafety?.preprocess({ workspaceId: command.workspaceId, requestId, content: raw, feature: command.feature });
    const requestedRetention = command.executionContext?.retentionPolicy;
    const retentionDays = requestedRetention?.retainPrompt ? Math.min(requestedRetention.days, safety?.retentionDays ?? 0) : 0;
    await this.observability?.start({ requestId, correlationId: command.correlationId, workspaceId: command.workspaceId, feature: command.feature, ...(command.executionContext ?? {}), promptVersion: effectivePromptVersion, ...(retentionDays ? { retainedPrompt: safety!.content, deleteAfter: new Date(Date.now() + retentionDays * 86_400_000) } : {}) });
    this.moderation.assertSafe(raw);
    if (this.injection.detect(raw).detected && command.feature === 'rag')
      throw new BadRequestException('Prompt injection detected in retrieved context');
    const messages =
      command.dataClassification === 'restricted' || safety?.interventions.includes('pii_redacted')
        ? command.messages.map((m) => ({ ...m, content: this.pii.redact(m.content) }))
        : command.messages;
    const inputTokens = this.tokens.countMessages(messages),
      required = [
        ...(command.capabilities ?? ['chat']),
        ...(command.jsonSchema ? ['json' as const] : []),
        ...(command.tools?.length ? ['tools' as const] : []),
      ];
    const routing = this.router.decide({
      capabilities: [...new Set(required)],
      allowedProviders: allowed,
      minimumContextTokens: inputTokens + command.maxTokens,
      minimumOutputTokens: command.maxTokens,
      ...(inputTokens + command.maxTokens ? { maxCostPerMillion: command.maxCostUsd * 1_000_000 / (inputTokens + command.maxTokens) } : {}),
      ...(command.preferredModel ? { preferredModel: command.preferredModel } : {}),
      ...(command.routingPolicy ?? {}),
    });
    const model = routing.primary;
    if (
      (command.maxInputTokens !== undefined && inputTokens > command.maxInputTokens) ||
      inputTokens + command.maxTokens > model.contextTokens ||
      command.maxTokens > model.maxOutputTokens
    )
      throw new BadRequestException('AI token limit exceeded');
    const estimate = this.costs.estimate(model, inputTokens, command.maxTokens);
    if (estimate > Math.min(command.maxCostUsd, featurePolicy?.remainingCostUsd ?? Number.POSITIVE_INFINITY) || inputTokens + command.maxTokens > (featurePolicy?.remainingTokens ?? Number.POSITIVE_INFINITY))
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
        await this.observability?.finish(requestId, { ...(hit.provider ? { provider: hit.provider } : {}), ...(hit.model ? { model: hit.model } : {}), latencyMs: Date.now() - startedAt, inputTokens: hit.usage.inputTokens, outputTokens: hit.usage.outputTokens, cacheHit: true, selectionReason: routing.selectionReason, safetyInterventions: safety?.interventions ?? [], status: 'completed' });
        return hit;
      }
    }
    const ordered = [routing.primary, ...routing.fallbackChain]
      .map((candidate) => ({ provider: this.providers.get(candidate.provider), model: candidate.model }))
      .filter((value): value is { provider: AiProvider; model: string } => Boolean(value.provider));
    if (!ordered.length)
      throw new ServiceUnavailableException('No configured AI provider is available');
    let result: Awaited<ReturnType<FallbackPolicyService['execute']>>;
    try {
      result = await this.fallback.execute(ordered, request, { retries: command.routingPolicy?.retries ?? 2, timeoutMs: Math.min(command.routingPolicy?.timeoutMs ?? 30_000, command.executionContext ? Math.max(1, command.executionContext.deadline.valueOf() - Date.now()) : 30_000), retrySafe: true, hedgedSafe: command.routingPolicy?.hedgedSafe === true, ...(command.routingPolicy?.hedgeDelayMs === undefined ? {} : { hedgeDelayMs: command.routingPolicy.hedgeDelayMs }) });
    } catch (error) {
      await this.observability?.finish(requestId, { model: model.model, latencyMs: Date.now() - startedAt, status: 'failed', errorCode: error instanceof Error ? error.name : 'provider_failure' });
      throw error;
    }
    const actualModel = this.capabilities.get(result.provider.name, result.model) ?? model;
    const actualCost = this.costs.actual(actualModel, result.response.usage);
    let response = result.response;
    response = { ...response, provider: result.provider.name, model: result.model };
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
      model: result.model,
      inputTokens: response.usage.inputTokens,
      outputTokens: response.usage.outputTokens,
      costUsd: actualCost,
      promptHash: this.cache.key(messages),
      dataClassification: command.dataClassification ?? 'internal',
      promptVersion: effectivePromptVersion,
    });
    if (cacheKey) await this.cache.set(cacheKey, response);
    await this.observability?.finish(requestId, { provider: result.provider.name, model: result.model, latencyMs: Date.now() - startedAt, inputTokens: response.usage.inputTokens, outputTokens: response.usage.outputTokens, costUsd: actualCost, retries: result.retries, fallbackUsed: result.fallbackUsed, fallbackReason: result.fallbackReason, selectionReason: routing.selectionReason, cacheHit: false, toolCalls: response.toolCalls?.map((tool) => tool.name) ?? [], safetyInterventions: safety?.interventions ?? [], status: 'completed' });
    return response;
  }
  private validateStructured(value: unknown, schema: Record<string, unknown>, path = '$') {
    if (Array.isArray(schema.enum) && !schema.enum.some((candidate) => Object.is(candidate, value))) throw new Error(`${path} is outside enum`);
    if (schema.type === 'object') {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`${path} must be object`);
      const object = value as Record<string, unknown>, properties = (schema.properties ?? {}) as Record<string, Record<string, unknown>>;
      for (const key of (schema.required as string[]) ?? []) if (!(key in object)) throw new Error(`Missing ${path}.${key}`);
      if (schema.additionalProperties === false) for (const key of Object.keys(object)) if (!(key in properties)) throw new Error(`Unexpected ${path}.${key}`);
      for (const [key, child] of Object.entries(properties)) if (key in object) this.validateStructured(object[key], child, `${path}.${key}`);
      return;
    }
    if (schema.type === 'array') {
      if (!Array.isArray(value)) throw new Error(`${path} must be array`);
      const items = schema.items as Record<string, unknown> | undefined;
      if (items) value.forEach((entry, index) => this.validateStructured(entry, items, `${path}[${index}]`));
      return;
    }
    if (schema.type === 'string' && typeof value !== 'string') throw new Error(`${path} must be string`);
    if (schema.type === 'number' && typeof value !== 'number') throw new Error(`${path} must be number`);
    if (schema.type === 'integer' && (typeof value !== 'number' || !Number.isInteger(value))) throw new Error(`${path} must be integer`);
    if (schema.type === 'boolean' && typeof value !== 'boolean') throw new Error(`${path} must be boolean`);
  }
}
