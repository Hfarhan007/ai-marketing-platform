import { Injectable, Optional, ServiceUnavailableException } from '@nestjs/common';
import type { AiProvider, AiProviderError, AiRequest, AiResponse } from '../providers/ai-provider.interface.js';
import { ProviderHealthService } from './provider-health.service.js';
export interface ProviderRoute { provider: AiProvider; model: string }
export interface InvocationPolicy { retries?: number; timeoutMs?: number; retrySafe?: boolean; hedgedSafe?: boolean; hedgeDelayMs?: number }
@Injectable()
export class FallbackPolicyService {
  constructor(@Optional() private readonly health?: ProviderHealthService) {}
  async execute(routesOrProviders: readonly (ProviderRoute | AiProvider)[], request: AiRequest, policyOrRetries: InvocationPolicy | number = {}): Promise<{ response: AiResponse; provider: AiProvider; model: string; retries: number; fallbackUsed: boolean; fallbackReason: string | null }> {
    const routes = routesOrProviders.map((value) => 'provider' in value ? value : { provider: value, model: request.model });
    const policy = typeof policyOrRetries === 'number' ? { retries: policyOrRetries } : policyOrRetries;
    if (policy.hedgedSafe && routes.length > 1) return this.hedge(routes.slice(0, 2), request, policy);
    const errors: string[] = []; let attempts = 0, fallbackReason: string | null = null;
    for (const [routeIndex, route] of routes.entries()) {
      if (this.health && !this.health.available(route.provider.name)) { fallbackReason ??= `${route.provider.name}:${this.health.reason(route.provider.name) ?? 'unhealthy'}`; continue; }
      const retries = policy.retrySafe === false ? 0 : (policy.retries ?? 2);
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const response = await this.invoke(route, request, policy.timeoutMs);
          this.assertResponse(response);
          this.health?.success(route.provider.name);
          return { response, provider: route.provider, model: route.model, retries: attempts, fallbackUsed: routeIndex > 0, fallbackReason };
        } catch (error) {
          attempts++; this.health?.failure(route.provider.name);
          const reason = error instanceof Error ? error.message : 'failed';
          errors.push(`${route.provider.name}:${reason}`); fallbackReason ??= `${route.provider.name}:${reason}`;
          if (this.health && !this.health.available(route.provider.name)) break;
          if (!(error as AiProviderError).retryable) break;
          if (attempt < retries) await new Promise((resolve) => setTimeout(resolve, Math.min(30_000, (error as AiProviderError).retryAfterMs ?? 100 * 2 ** attempt)));
        }
      }
    }
    throw new ServiceUnavailableException(`All policy-compliant AI providers failed: ${errors.join('; ')}`);
  }
  async executeEmbedding(routes: ProviderRoute[], request: Omit<AiRequest, 'messages'> & { inputs: string[] }, policy: InvocationPolicy = {}) {
    const errors: string[] = []; let attempts = 0, fallbackReason: string | null = null;
    for (const [routeIndex, route] of routes.entries()) {
      if (this.health && !this.health.available(route.provider.name)) { fallbackReason ??= `${route.provider.name}:${this.health.reason(route.provider.name) ?? 'unhealthy'}`; continue; }
      for (let attempt = 0; attempt <= (policy.retries ?? 2); attempt++) {
        try {
          const result = await this.invokeEmbedding(route, request, policy.timeoutMs);
          this.health?.success(route.provider.name);
          return { ...result, provider: route.provider, model: route.model, retries: attempts, fallbackUsed: routeIndex > 0, fallbackReason };
        } catch (error) {
          attempts++; this.health?.failure(route.provider.name);
          const reason = error instanceof Error ? error.message : 'failed'; errors.push(`${route.provider.name}:${reason}`); fallbackReason ??= `${route.provider.name}:${reason}`;
          if (this.health && !this.health.available(route.provider.name)) break;
          if (!(error as AiProviderError).retryable) break;
        }
      }
    }
    throw new ServiceUnavailableException(`All policy-compliant embedding providers failed: ${errors.join('; ')}`);
  }
  private async invoke(route: ProviderRoute, request: AiRequest, timeoutMs = 30_000) {
    const controller = new AbortController(), abort = () => controller.abort(request.signal?.reason ?? new Error('AI invocation cancelled'));
    request.signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(() => controller.abort(new Error('AI provider timeout budget exceeded')), timeoutMs);
    try { return await route.provider.chat({ ...request, model: route.model, signal: controller.signal }); }
    finally { clearTimeout(timer); request.signal?.removeEventListener('abort', abort); }
  }
  private assertResponse(value: AiResponse) {
    if (typeof value?.content !== 'string' || !value.usage || !Number.isFinite(value.usage.inputTokens) || !Number.isFinite(value.usage.outputTokens)) throw new Error('AI provider returned a malformed response');
  }
  private async invokeEmbedding(route: ProviderRoute, request: Omit<AiRequest, 'messages'> & { inputs: string[] }, timeoutMs = 30_000) {
    const controller = new AbortController(), abort = () => controller.abort(request.signal?.reason ?? new Error('AI invocation cancelled'));
    request.signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(() => controller.abort(new Error('AI provider timeout budget exceeded')), timeoutMs);
    try { return await route.provider.embed({ ...request, model: route.model, signal: controller.signal }); }
    finally { clearTimeout(timer); request.signal?.removeEventListener('abort', abort); }
  }
  private async hedge(routes: ProviderRoute[], request: AiRequest, policy: InvocationPolicy) {
    if (request.tools?.length || request.temperature !== 0) throw new ServiceUnavailableException('Hedging is allowed only for deterministic, tool-free requests');
    const invoke = async (route: ProviderRoute) => ({ response: await this.invoke(route, request, policy.timeoutMs), route });
    const secondary = async () => { await new Promise((resolve) => setTimeout(resolve, policy.hedgeDelayMs ?? 150)); return invoke(routes[1]!); };
    try {
      const winner = await Promise.any([invoke(routes[0]!), secondary()]);
      this.health?.success(winner.route.provider.name);
      return { response: winner.response, provider: winner.route.provider, model: winner.route.model, retries: 0, fallbackUsed: winner.route !== routes[0], fallbackReason: winner.route !== routes[0] ? 'hedged_primary_slower_or_failed' : null };
    } catch (error) {
      for (const route of routes) this.health?.failure(route.provider.name);
      throw new ServiceUnavailableException(`Hedged providers failed: ${error instanceof Error ? error.message : 'failed'}`);
    }
  }
}
