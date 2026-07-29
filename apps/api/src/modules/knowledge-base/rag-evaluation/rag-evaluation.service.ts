import { Injectable } from '@nestjs/common';
import { RagRepository } from '../repositories/rag.repository.js';
@Injectable()
export class RagEvaluationService {
  constructor(private readonly repository: RagRepository) {}
  record(input: { workspaceId: string; correlationId: string; relevance: number; groundedness: number; metadata?: Record<string, unknown> }) {
    if (input.relevance < 0 || input.relevance > 1 || input.groundedness < 0 || input.groundedness > 1) throw new Error('RAG evaluation scores must be between zero and one');
    return this.repository.evaluate({ ...input, metadata: input.metadata ?? {} });
  }
}
