import { describe, expect, it, vi } from 'vitest';
import { ForbiddenException, HttpException, ServiceUnavailableException } from '@nestjs/common';
import { AiReliabilityService } from './ai-reliability.service.js';
import { AiCacheService } from '../cache/ai-cache.service.js';
import { AiProviderError, type AiProvider, type AiRequest } from '../providers/ai-provider.interface.js';
import { FallbackPolicyService } from '../routing/fallback-policy.service.js';

function redisMock(maxConcurrent = Number.POSITIVE_INFINITY) {
  let concurrent = 0;
  return { get: vi.fn().mockResolvedValue(null), set: vi.fn().mockResolvedValue('OK'), keys: vi.fn().mockResolvedValue([]), del: vi.fn().mockResolvedValue(0), eval: vi.fn((script: string) => { if (script.includes("c>=tonumber")) { if (concurrent >= maxConcurrent) return Promise.resolve(0); concurrent++; return Promise.resolve(1); } concurrent = Math.max(0, concurrent - 1); return Promise.resolve(1); }), concurrent: () => concurrent };
}
const usage = (value = { tokens: 0, cost: 0 }) => ({ used: vi.fn().mockResolvedValue(value), usedFeature: vi.fn().mockResolvedValue(value), usedAgent: vi.fn().mockResolvedValue(value) });
const config = (values: Record<string, unknown> = {}) => ({ get: (key: string) => values[key] });

describe('AI production reliability', () => {
  it('enforces hard limits and emits soft-limit warnings', async () => {
    const hard = new AiReliabilityService(redisMock() as never, config({ 'ai.monthlyTokenQuota': 100 }) as never, usage({ tokens: 95, cost: 0 }) as never);
    await expect(hard.reserve({ workspaceId: 'w', feature: 'draft', estimatedTokens: 10, estimatedCostUsd: 0 })).rejects.toBeInstanceOf(ForbiddenException);
    const soft = new AiReliabilityService(redisMock() as never, config({ 'ai.monthlyTokenQuota': 100, 'ai.softLimitRatio': 0.8 }) as never, usage({ tokens: 75, cost: 0 }) as never);
    await expect(soft.reserve({ workspaceId: 'w', feature: 'draft', estimatedTokens: 10, estimatedCostUsd: 0 })).resolves.toMatchObject({ warning: true });
  });

  it('atomically rejects excess concurrency and releases reservations', async () => {
    const redis = redisMock(2), service = new AiReliabilityService(redis as never, config({ 'ai.workspaceConcurrency': 2 }) as never, usage() as never);
    const [a, b] = await Promise.all([service.reserve({ workspaceId: 'w', feature: 'draft', estimatedTokens: 1, estimatedCostUsd: 0 }), service.reserve({ workspaceId: 'w', feature: 'draft', estimatedTokens: 1, estimatedCostUsd: 0 })]);
    await expect(service.reserve({ workspaceId: 'w', feature: 'draft', estimatedTokens: 1, estimatedCostUsd: 0 })).rejects.toBeInstanceOf(HttpException);
    await service.reconcile(a, { tokens: 1, costUsd: 0 }); await service.release(b);
    expect(redis.concurrent()).toBe(0);
  });

  it('keeps exact and semantic cache keys inside privacy boundaries and invalidates only that boundary', async () => {
    const redis = redisMock(), cache = new AiCacheService(redis as never), a = { workspaceId: 'a', feature: 'draft', dataClassification: 'confidential' }, b = { ...a, workspaceId: 'b' };
    expect(cache.scopedKey(a, 'Hello, WORLD!', 'semantic')).toBe(cache.scopedKey(a, 'hello world', 'semantic'));
    expect(cache.scopedKey(a, 'hello')).not.toBe(cache.scopedKey(b, 'hello'));
    await cache.invalidate(a); expect(redis.keys).toHaveBeenCalledWith(expect.stringContaining(cache.key(a).slice(-64)));
  });

  it('sustains concurrent mock-provider load without losing responses', async () => {
    const provider: AiProvider = { name: 'ollama', chat: vi.fn((request: AiRequest) => Promise.resolve({ content: request.requestId, usage: { inputTokens: 1, outputTokens: 1 } })), embed: vi.fn(), stream: vi.fn(), health: vi.fn().mockResolvedValue(true) } as never;
    const fallback = new FallbackPolicyService(), results = await Promise.all(Array.from({ length: 100 }, (_, index) => fallback.execute([provider], { requestId: `load-${index}`, correlationId: 'load', workspaceId: 'w', feature: 'load', model: 'mock', messages: [], maxTokens: 1 }, { retries: 0 })));
    expect(new Set(results.map((result) => result.response.content)).size).toBe(100);
  });

  it.each([
    ['outage', () => new AiProviderError('outage', true, 503)],
    ['timeout', () => new AiProviderError('timeout', true, 504)],
    ['rate limit', () => new AiProviderError('limited', true, 429, 1)],
  ])('handles %s chaos with bounded retries and failure', async (_name, failure) => {
    const chat = vi.fn().mockRejectedValue(failure()), provider = { name: 'ollama', chat, embed: vi.fn(), stream: vi.fn(), health: vi.fn() } as unknown as AiProvider;
    await expect(new FallbackPolicyService().execute([provider], { requestId: 'chaos', correlationId: 'c', workspaceId: 'w', feature: 'chaos', model: 'mock', messages: [], maxTokens: 1 }, { retries: 1, timeoutMs: 10 })).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(chat).toHaveBeenCalledTimes(2);
  });

  it('rejects malformed provider payloads instead of treating them as success', async () => {
    const provider = { name: 'ollama', chat: vi.fn().mockResolvedValue({ content: 42 }), embed: vi.fn(), stream: vi.fn(), health: vi.fn() } as unknown as AiProvider;
    await expect(new FallbackPolicyService().execute([provider], { requestId: 'malformed', correlationId: 'c', workspaceId: 'w', feature: 'chaos', model: 'mock', messages: [], maxTokens: 1 }, 0)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
