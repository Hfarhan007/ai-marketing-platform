import { describe, expect, it } from 'vitest';
import { AiProviderError, type AiProvider, type AiRequest } from '../providers/ai-provider.interface.js';
import { MockAiProvider } from '../providers/mock.provider.js';
import { CapabilityRegistry } from './capability-registry.js';
import { FallbackPolicyService } from './fallback-policy.service.js';
import { ModelRouterService } from './model-router.service.js';
import { ProviderHealthService } from './provider-health.service.js';
const request: AiRequest = { requestId: 'r', correlationId: 'c', workspaceId: 'w', feature: 'test', model: 'model', messages: [{ role: 'user', content: 'hello' }], maxTokens: 10, temperature: 0 };
describe('policy-driven model routing', () => {
  it('routes on vision, context, quality, residency, privacy, language and streaming', () => {
    const decision = new ModelRouterService(new CapabilityRegistry()).decide({ capabilities: ['chat', 'vision', 'streaming'], allowedProviders: ['openai', 'gemini'], minimumContextTokens: 500_000, qualityClass: 'balanced', residency: 'eu', privacy: 'zero_retention', language: 'ur' });
    expect(decision.primary).toMatchObject({ provider: 'openai', model: 'gpt-4.1-mini' });
    expect(decision.rejected.find((model) => model.provider === 'gemini')?.reasons).toContain('privacy_policy');
  });
  it('never places residency or privacy violating models in the fallback chain', () => {
    const decision = new ModelRouterService(new CapabilityRegistry()).decide({ capabilities: ['chat'], allowedProviders: ['openai', 'gemini', 'groq', 'openrouter', 'ollama'], residency: 'eu', privacy: 'zero_retention' });
    expect([decision.primary, ...decision.fallbackChain].every((model) => model.regions.includes('eu') && ['zero_retention', 'local'].includes(model.privacy))).toBe(true);
  });
  it('honors workspace allowlists, preferred models and records selection reasons', () => {
    const decision = new ModelRouterService(new CapabilityRegistry()).decide({ capabilities: ['chat'], allowedProviders: ['groq'], preferredModel: 'llama-3.3-70b-versatile' });
    expect(decision.primary.provider).toBe('groq');
    expect(decision.selectionReason).toBe('preferred_model_satisfied_policy');
  });
  it('supports emergency disablement, circuit cooldown and health-aware routing', () => {
    const health = new ProviderHealthService(); health.disable('openai', 'security_incident');
    const router = new ModelRouterService(new CapabilityRegistry(), health);
    expect(router.decide({ capabilities: ['chat'], allowedProviders: ['openai', 'gemini'] }).primary.provider).toBe('gemini');
    health.enable('openai'); health.failure('openai'); health.failure('openai'); health.failure('openai');
    expect(health.available('openai')).toBe(false);
    expect(health.reason('openai')).toBe('provider_cooldown');
  });
  it('separates retryable model invocation from non-idempotent tool effects', async () => {
    let calls = 0;
    const primary = new MockAiProvider() as AiProvider;
    Object.defineProperty(primary, 'name', { value: 'openai' });
    primary.chat = () => { calls++; return Promise.reject(new AiProviderError('retryable', true)); };
    const backup = new MockAiProvider('ok');
    const result = await new FallbackPolicyService().execute([{ provider: primary, model: 'a' }, { provider: backup, model: 'b' }], request, { retries: 5, retrySafe: false });
    expect(calls).toBe(1);
    expect(result).toMatchObject({ fallbackUsed: true, fallbackReason: 'openai:retryable', model: 'b' });
  });
  it('allows hedging only for explicitly safe deterministic requests', async () => {
    const providers = [{ provider: new MockAiProvider('a'), model: 'a' }, { provider: new MockAiProvider('b'), model: 'b' }];
    await expect(new FallbackPolicyService().execute(providers, { ...request, tools: [{ name: 'write', description: '', inputSchema: {} }] }, { hedgedSafe: true })).rejects.toThrow('deterministic');
    await expect(new FallbackPolicyService().execute(providers, request, { hedgedSafe: true, hedgeDelayMs: 1 })).resolves.toMatchObject({ model: 'a' });
  });
});
