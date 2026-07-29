import { Injectable } from '@nestjs/common';
import { AiGovernanceRepository } from '../repositories/ai-governance.repository.js';
@Injectable()
export class AiFeedbackService {
  constructor(private readonly repository: AiGovernanceRepository) {}
  submit(value: { workspaceId: string; requestId: string; userId: string; kind: 'positive' | 'negative' | 'hallucination' | 'unsafe' | 'bad_citation'; comment?: string }) { return this.repository.submitFeedback(value); }
}
