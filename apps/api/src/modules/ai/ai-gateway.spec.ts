import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AiGatewayService } from './ai-gateway.service.js';
import { AiCacheService } from './cache/ai-cache.service.js';
import { MockAiProvider } from './providers/mock.provider.js';
import type { AiProvider } from './providers/ai-provider.interface.js';
import { OpenAiProvider } from './providers/openai.provider.js';
import { CapabilityRegistry } from './routing/capability-registry.js';
import { FallbackPolicyService } from './routing/fallback-policy.service.js';
import { ModelRouterService } from './routing/model-router.service.js';
import { ModerationService } from './safety/moderation.service.js';
import { PiiRedactionService } from './safety/pii-redaction.service.js';
import { PromptInjectionDetector } from './safety/prompt-injection-detector.js';
import { AiStreamingService } from './streaming/ai-streaming.service.js';
import { CostCalculatorService } from './usage/cost-calculator.service.js';
import { TokenCounterService } from './usage/token-counter.service.js';

const workspaceId = '507f1f77bcf86cd799439011';
function gateway(overrides: { used?: { tokens: number; cost: number } } = {}) {
  const config = {
    get: (key: string) =>
      (
        {
          'ai.allowedProviders': ['ollama'],
          'ai.monthlyTokenQuota': 10_000,
          'ai.monthlyCostQuotaUsd': 10,
        } as Record<string, unknown>
      )[key],
  };
  const registry = new CapabilityRegistry();
  const usage = {
    used: vi.fn().mockResolvedValue(overrides.used ?? { tokens: 0, cost: 0 }),
    record: vi.fn().mockResolvedValue({}),
  };
  const redis = {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
  };
  const value = new AiGatewayService(
    config as never,
    new ModelRouterService(registry),
    new FallbackPolicyService(),
    registry,
    new TokenCounterService(),
    new CostCalculatorService(),
    usage as never,
    new ModerationService(),
    new PiiRedactionService(),
    new PromptInjectionDetector(),
    new AiCacheService(redis as never),
  );
  value.register(new MockAiProvider());
  return { value, usage };
}
const command = {
  correlationId: 'correlation-1',
  workspaceId,
  userId: 'user-1',
  feature: 'crm_summaries',
  messages: [{ role: 'user' as const, content: 'Summarize this contact' }],
  maxTokens: 100,
  maxCostUsd: 1,
  temperature: 0,
};

describe('AI provider gateway', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('routes by capability and preferred model', () => {
    const registry = new CapabilityRegistry();
    const route = new ModelRouterService(registry).route({
      capabilities: ['embeddings'],
      allowedProviders: ['openai', 'gemini'],
      preferredModel: 'text-embedding-3-small',
    });
    expect(route).toMatchObject({ provider: 'openai', model: 'text-embedding-3-small' });
  });

  it('falls back to the next provider after a retryable failure', async () => {
    const failed = new MockAiProvider();
    failed.failures = 1;
    const backup = new MockAiProvider('backup');
    Object.defineProperty(failed, 'name', { value: 'openai' });
    Object.defineProperty(backup, 'name', { value: 'ollama' });
    const result = await new FallbackPolicyService().execute(
      [failed, backup] as AiProvider[],
      { ...command, requestId: 'request', model: 'model' },
      0,
    );
    expect(result.response.content).toBe('backup');
  });

  it('times out provider calls', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init: RequestInit) => {
        return new Promise((_resolve, reject) =>
          init.signal?.addEventListener('abort', () => reject(new Error('aborted'))),
        );
      }),
    );
    const config = {
      get: (key: string) =>
        ({ 'ai.openaiApiKey': 'test-only', 'ai.timeoutMs': 5 } as Record<string, unknown>)[key],
    };
    await expect(
      new OpenAiProvider(config as never).chat({
        ...command,
        requestId: 'request',
        model: 'gpt-4.1-mini',
      }),
    ).rejects.toThrow();
  });

  it('validates structured output', async () => {
    const { value } = gateway();
    await expect(
      value.execute({
        ...command,
        jsonSchema: { type: 'object', required: ['missing'] },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accounts for tokens and persists correlated usage without raw prompts', async () => {
    const { value, usage } = gateway();
    const response = await value.execute(command);
    expect(response.usage.inputTokens).toBeGreaterThan(0);
    const persisted = usage.record.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(persisted.correlationId).toBe('correlation-1');
    expect(persisted.workspaceId).toBeDefined();
    expect(JSON.stringify(persisted)).not.toContain('Summarize this contact');
  });

  it('rejects workspace quota exhaustion', async () => {
    const { value } = gateway({ used: { tokens: 9_999, cost: 0 } });
    await expect(value.execute(command)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('cancels streaming promptly', async () => {
    const controller = new AbortController();
    const provider = new MockAiProvider('one two three');
    const iterator = new AiStreamingService().stream(provider, {
      ...command,
      requestId: 'request',
      model: 'model',
      signal: controller.signal,
    })[Symbol.asyncIterator]();
    await iterator.next();
    controller.abort(new Error('cancelled'));
    await expect(iterator.next()).rejects.toThrow('cancelled');
  });
});
