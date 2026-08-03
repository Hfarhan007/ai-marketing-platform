import { BadRequestException, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { LONG_TERM_MEMORY_TYPES, MEMORY_TYPES, type MemoryType } from '../ai-memory.schema.js';

export const memoryCandidateSchema = z.object({
  subjectType: z.enum(['user', 'contact', 'workspace', 'conversation', 'task']),
  subjectId: z.string().regex(/^[a-f\d]{24}$/iu),
  memoryType: z.enum(MEMORY_TYPES),
  factKey: z.string().trim().regex(/^[a-z][a-z0-9_.-]{1,99}$/u),
  content: z.union([z.string().max(10_000), z.record(z.string(), z.union([z.string().max(2_000), z.number(), z.boolean(), z.null()]))]),
  normalizedSummary: z.string().trim().min(3).max(1_000),
  embedding: z.array(z.number().finite()).min(2).max(4_096).optional(),
  source: z.object({ kind: z.enum(['conversation', 'user_review', 'workspace_document', 'task', 'system_event']), id: z.string().min(1).max(200), occurredAt: z.coerce.date() }).strict(),
  confidence: z.number().min(0).max(1),
  sensitivity: z.enum(['public', 'internal', 'confidential', 'restricted']),
  verified: z.boolean().default(false),
  ttlDays: z.number().int().min(1).max(365),
}).strict();
export type MemoryCandidate = z.infer<typeof memoryCandidateSchema>;

@Injectable()
export class MemoryExtractionPolicy {
  validate(value: unknown, origin: 'trusted_extractor' | 'user_review'): MemoryCandidate {
    if (!['trusted_extractor', 'user_review'].includes(origin)) throw new BadRequestException('Direct model memory writes are prohibited');
    const candidate = memoryCandidateSchema.parse(value);
    if (candidate.memoryType === 'semantic' && !candidate.embedding) throw new BadRequestException('Semantic memory requires an embedding');
    if (!this.isLongTerm(candidate.memoryType) && candidate.ttlDays > 30) throw new BadRequestException('Short-term memory retention exceeds policy');
    if (candidate.sensitivity === 'restricted' && origin !== 'user_review') throw new BadRequestException('Restricted memory requires user review');
    if (candidate.source.kind === 'user_review') candidate.verified = true;
    return candidate;
  }
  isLongTerm(type: MemoryType) { return LONG_TERM_MEMORY_TYPES.includes(type); }
}
