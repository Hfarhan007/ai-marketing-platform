import { ForbiddenException, Injectable } from '@nestjs/common';
import { PiiRedactionService } from '../ai/safety/pii-redaction.service.js';
import { ConsentEvaluationService } from '../consent/consent-evaluation.service.js';
import type { MemoryType } from './ai-memory.schema.js';
import { MemoryExtractionPolicy } from './memory/memory-extraction.policy.js';
import { isRetrievable } from './memory/memory-resolution.js';
import { AiMemoryRepository } from './repositories/ai-memory.repository.js';

@Injectable()
export class AiMemoryService {
  constructor(private readonly records: AiMemoryRepository, private readonly consent: ConsentEvaluationService, private readonly extraction: MemoryExtractionPolicy, private readonly pii: PiiRedactionService) {}

  async extract(input: { workspaceId: string; region?: string; origin: 'trusted_extractor' | 'user_review'; policyEligible: boolean; redactPii: boolean; candidate: unknown }) {
    const candidate = this.extraction.validate(input.candidate, input.origin);
    const evaluation = await this.requireConsent(input.workspaceId, candidate.subjectId, input.region);
    if (this.extraction.isLongTerm(candidate.memoryType) && !input.policyEligible) throw new ForbiddenException('Long-term memory is not policy eligible');
    const content = input.redactPii ? this.redactValue(candidate.content) : candidate.content;
    const normalizedSummary = input.redactPii ? this.pii.redact(candidate.normalizedSummary) : candidate.normalizedSummary;
    return this.records.remember({ ...candidate, workspaceId: input.workspaceId, storageTier: this.extraction.isLongTerm(candidate.memoryType) ? 'long_term' : 'short_term', content, normalizedSummary, consentBasis: { policyVersionId: evaluation.policyVersionId, reason: evaluation.reason, evaluatedAt: evaluation.evaluatedAt }, retentionExpiry: new Date(Date.now() + candidate.ttlDays * 86_400_000) });
  }

  async recall(input: { workspaceId: string; subjectType?: string; subjectId: string; region?: string; memoryTypes?: MemoryType[]; maxMemories?: number; maxTokens?: number }) {
    await this.requireConsent(input.workspaceId, input.subjectId, input.region);
    const maxMemories = Math.min(Math.max(input.maxMemories ?? 10, 1), 20), maxTokens = Math.min(Math.max(input.maxTokens ?? 1_000, 1), 4_000);
    const candidates = await this.records.recall({ workspaceId: input.workspaceId, subjectId: input.subjectId, ...(input.subjectType ? { subjectType: input.subjectType } : {}), ...(input.memoryTypes ? { memoryTypes: input.memoryTypes } : {}), limit: maxMemories });
    let usedTokens = 0;
    const memories = candidates.filter((record) => { if (!isRetrievable(record)) return false; const tokens = Math.ceil(record.normalizedSummary.length / 4); if (usedTokens + tokens > maxTokens) return false; usedTokens += tokens; return true; });
    await this.records.touch(input.workspaceId, memories.map(({ _id }) => _id));
    return { memories, usedTokens };
  }
  async review(workspaceId: string, subjectId: string, region?: string) { await this.requireConsent(workspaceId, subjectId, region); return this.records.review(workspaceId, subjectId); }
  delete(workspaceId: string, subjectId: string, recordId: string) { return this.records.deleteOne(workspaceId, subjectId, recordId); }
  deleteAll(workspaceId: string, subjectId: string) { return this.records.deleteForSubject(workspaceId, subjectId); }

  private async requireConsent(workspaceId: string, subjectId: string, region?: string) {
    const evaluation = await this.consent.evaluate({ workspaceId, subjectId, purpose: 'ai_memory', ...(region ? { region } : {}) });
    if (!evaluation.allowed || !evaluation.policyVersionId) throw new ForbiddenException(`AI memory prohibited: ${evaluation.reason}`);
    return evaluation as typeof evaluation & { policyVersionId: string };
  }
  private redactValue(value: unknown): unknown {
    if (typeof value === 'string') return this.pii.redact(value);
    if (Array.isArray(value)) return value.map((entry) => this.redactValue(entry));
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, this.redactValue(entry)]));
    return value;
  }
}
