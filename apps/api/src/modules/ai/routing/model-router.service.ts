import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import type { AiCapability, AiProviderName } from '../providers/ai-provider.interface.js';
import { CapabilityRegistry, type ModelCapability } from './capability-registry.js';
import { ProviderHealthService } from './provider-health.service.js';
export interface ModelRoutingRequest {
  capabilities: AiCapability[];
  allowedProviders: AiProviderName[];
  preferredModel?: string;
  maxCostPerMillion?: number;
  localOnly?: boolean;
  minimumContextTokens?: number;
  minimumOutputTokens?: number;
  latencyClass?: 'realtime' | 'standard' | 'batch';
  qualityClass?: 'economy' | 'balanced' | 'premium';
  residency?: string;
  privacy?: 'local' | 'zero_retention' | 'standard';
  language?: string;
}
export interface ModelRoutingDecision {
  primary: ModelCapability;
  fallbackChain: ModelCapability[];
  selectionReason: string;
  rejected: Array<{ provider: AiProviderName; model: string; reasons: string[] }>;
}
const qualityRank = { economy: 0, balanced: 1, premium: 2 }, latencyRank = { realtime: 0, standard: 1, batch: 2 }, privacyRank = { standard: 0, zero_retention: 1, local: 2 };
@Injectable()
export class ModelRouterService {
  constructor(private readonly registry: CapabilityRegistry, @Optional() private readonly health?: ProviderHealthService) {}
  decide(input: ModelRoutingRequest): ModelRoutingDecision {
    const accepted: ModelCapability[] = [], rejected: ModelRoutingDecision['rejected'] = [];
    for (const model of this.registry.all()) {
      const reasons: string[] = [];
      if (!input.allowedProviders.includes(model.provider)) reasons.push('workspace_provider_not_allowed');
      if (input.localOnly && model.provider !== 'ollama') reasons.push('local_only');
      if (!input.capabilities.every((capability) => model.capabilities.includes(capability))) reasons.push('missing_capability');
      if (input.minimumContextTokens && model.contextTokens < input.minimumContextTokens) reasons.push('context_window_too_small');
      if (input.minimumOutputTokens && model.maxOutputTokens < input.minimumOutputTokens) reasons.push('output_limit_too_small');
      if (input.maxCostPerMillion !== undefined && model.inputCostPerMillion + model.outputCostPerMillion > input.maxCostPerMillion) reasons.push('budget_exceeded');
      if (input.latencyClass && latencyRank[model.latencyClass] > latencyRank[input.latencyClass]) reasons.push('latency_class');
      if (input.qualityClass && qualityRank[model.qualityClass] < qualityRank[input.qualityClass]) reasons.push('quality_class');
      if (input.residency && !model.regions.includes(input.residency)) reasons.push('data_residency');
      if (input.privacy && privacyRank[model.privacy] < privacyRank[input.privacy]) reasons.push('privacy_policy');
      if (input.language && !model.languages.includes('*') && !model.languages.includes(input.language)) reasons.push('language');
      if (this.health && !this.health.available(model.provider)) reasons.push(this.health.reason(model.provider) ?? 'provider_unhealthy');
      if (reasons.length) rejected.push({ provider: model.provider, model: model.model, reasons }); else accepted.push(model);
    }
    accepted.sort((left, right) => {
      if (left.model === input.preferredModel) return -1;
      if (right.model === input.preferredModel) return 1;
      const health = (this.health?.score(right.provider) ?? 1) - (this.health?.score(left.provider) ?? 1);
      if (health) return health;
      if (input.qualityClass) { const quality = qualityRank[right.qualityClass] - qualityRank[left.qualityClass]; if (quality) return quality; }
      if (input.latencyClass) { const latency = latencyRank[left.latencyClass] - latencyRank[right.latencyClass]; if (latency) return latency; }
      return left.inputCostPerMillion + left.outputCostPerMillion - right.inputCostPerMillion - right.outputCostPerMillion;
    });
    const primary = accepted[0];
    if (!primary) throw new BadRequestException('No permitted healthy model satisfies routing policy');
    return { primary, fallbackChain: accepted.slice(1), selectionReason: primary.model === input.preferredModel ? 'preferred_model_satisfied_policy' : `policy_ranked:health=${this.health?.score(primary.provider) ?? 1}:quality=${primary.qualityClass}:latency=${primary.latencyClass}:cost=${primary.inputCostPerMillion + primary.outputCostPerMillion}`, rejected };
  }
  route(input: ModelRoutingRequest) { return this.decide(input).primary; }
}
