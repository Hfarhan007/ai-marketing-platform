import { Injectable } from '@nestjs/common';
import type { AiProviderName } from '../providers/ai-provider.interface.js';
interface ProviderState { failures: number; successes: number; openedAt: number | null; cooldownUntil: number; disabledReason: string | null }
@Injectable()
export class ProviderHealthService {
  private readonly states = new Map<AiProviderName, ProviderState>();
  private state(provider: AiProviderName) {
    let value = this.states.get(provider);
    if (!value) { value = { failures: 0, successes: 0, openedAt: null, cooldownUntil: 0, disabledReason: null }; this.states.set(provider, value); }
    return value;
  }
  score(provider: AiProviderName) {
    const state = this.state(provider), total = state.failures + state.successes;
    if (state.disabledReason || state.cooldownUntil > Date.now()) return 0;
    return total ? Math.max(0.05, state.successes / total) : 1;
  }
  available(provider: AiProviderName) { return this.score(provider) > 0; }
  success(provider: AiProviderName) { const state = this.state(provider); state.successes++; state.failures = Math.max(0, state.failures - 1); state.openedAt = null; }
  failure(provider: AiProviderName, cooldownMs = 30_000) {
    const state = this.state(provider); state.failures++;
    if (state.failures >= 3) { state.openedAt = Date.now(); state.cooldownUntil = Date.now() + cooldownMs; }
  }
  disable(provider: AiProviderName, reason = 'emergency_manual_disable') { this.state(provider).disabledReason = reason; }
  enable(provider: AiProviderName) { const state = this.state(provider); state.disabledReason = null; state.failures = 0; state.cooldownUntil = 0; state.openedAt = null; }
  reason(provider: AiProviderName) { const state = this.state(provider); return state.disabledReason ?? (state.cooldownUntil > Date.now() ? 'provider_cooldown' : null); }
}
