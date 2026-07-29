import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConsentEvaluationService } from '../consent/consent-evaluation.service.js';
import { AiMemoryRepository } from './repositories/ai-memory.repository.js';

@Injectable()
export class AiMemoryService {
  constructor(
    private readonly records: AiMemoryRepository,
    private readonly consent: ConsentEvaluationService,
  ) {}

  async remember(input: {
    workspaceId: string;
    subjectId: string;
    key: string;
    value: unknown;
    region?: string;
  }) {
    const evaluation = await this.requireConsent(input);
    return this.records.remember({
      ...input,
      region: input.region ?? 'GLOBAL',
      policyVersionId: evaluation.policyVersionId,
    });
  }

  async recall(input: { workspaceId: string; subjectId: string; region?: string }) {
    await this.requireConsent(input);
    return this.records.recall(input.workspaceId, input.subjectId);
  }

  private async requireConsent(input: { workspaceId: string; subjectId: string; region?: string }) {
    const evaluation = await this.consent.evaluate({ ...input, purpose: 'ai_memory' });
    if (!evaluation.allowed || !evaluation.policyVersionId)
      throw new ForbiddenException(`AI memory prohibited: ${evaluation.reason}`);
    return evaluation as typeof evaluation & { policyVersionId: string };
  }
}
