import { BadRequestException, Injectable } from '@nestjs/common';
import type { AiCapability, AiProviderName } from '../providers/ai-provider.interface.js';
import { CapabilityRegistry, type ModelCapability } from './capability-registry.js';
@Injectable()
export class ModelRouterService {
  constructor(private readonly registry: CapabilityRegistry) {}
  route(input: {
    capabilities: AiCapability[];
    allowedProviders: AiProviderName[];
    preferredModel?: string;
    maxCostPerMillion?: number;
    localOnly?: boolean;
  }): ModelCapability {
    const candidates = this.registry
      .all()
      .filter(
        (v) =>
          input.allowedProviders.includes(v.provider) &&
          (!input.localOnly || v.provider === 'ollama') &&
          input.capabilities.every((c) => v.capabilities.includes(c)) &&
          (input.maxCostPerMillion === undefined ||
            v.inputCostPerMillion <= input.maxCostPerMillion),
      );
    const preferred = candidates.find((v) => v.model === input.preferredModel);
    const selected =
      preferred ?? candidates.sort((a, b) => a.inputCostPerMillion - b.inputCostPerMillion)[0];
    if (!selected)
      throw new BadRequestException('No permitted model satisfies required capabilities');
    return selected;
  }
}
