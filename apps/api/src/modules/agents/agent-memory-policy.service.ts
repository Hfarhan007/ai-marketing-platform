import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConsentEvaluationService } from '../consent/consent-evaluation.service.js';
@Injectable()
export class AgentMemoryPolicyService {
  constructor(private readonly consent: ConsentEvaluationService) {}
  async authorize(input: { workspaceId: string; subjectId: string; region?: string; longTermEnabled: boolean; ttlDays: number }) {
    if (!input.longTermEnabled) throw new ForbiddenException('Long-term agent memory is disabled');
    if (input.ttlDays < 1 || input.ttlDays > 365) throw new ForbiddenException('Invalid memory retention policy');
    const evaluation = await this.consent.evaluate({ workspaceId: input.workspaceId, subjectId: input.subjectId, purpose: 'ai_memory', ...(input.region ? { region: input.region } : {}) });
    if (!evaluation.allowed || !evaluation.policyVersionId) throw new ForbiddenException(`Agent memory prohibited: ${evaluation.reason}`);
    return { expiresAt: new Date(Date.now() + input.ttlDays * 86_400_000), policyVersionId: evaluation.policyVersionId };
  }
}
