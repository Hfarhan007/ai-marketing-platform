import { Injectable } from '@nestjs/common';
import type { AiUsage } from '../providers/ai-provider.interface.js';
import type { ModelCapability } from '../routing/capability-registry.js';
@Injectable()
export class CostCalculatorService {
  estimate(model: ModelCapability, inputTokens: number, outputTokens: number) {
    return (
      (inputTokens * model.inputCostPerMillion + outputTokens * model.outputCostPerMillion) /
      1_000_000
    );
  }
  actual(model: ModelCapability, usage: AiUsage) {
    return this.estimate(model, usage.inputTokens, usage.outputTokens);
  }
}
