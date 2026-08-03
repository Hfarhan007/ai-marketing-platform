import { describe, expect, it, vi } from 'vitest';
import { PiiRedactionService } from '../../ai/safety/pii-redaction.service.js';
import { AiMemoryService } from '../ai-memory.service.js';
import { MemoryExtractionPolicy } from './memory-extraction.policy.js';
import { isRetrievable, shouldSupersede } from './memory-resolution.js';

const id = '507f1f77bcf86cd799439011';
const candidate = { subjectType: 'user', subjectId: id, memoryType: 'user_preference', factKey: 'communication.channel', content: 'Email me at private@example.com', normalizedSummary: 'Prefers email at private@example.com', source: { kind: 'conversation', id: 'message-1', occurredAt: new Date() }, confidence: 0.8, sensitivity: 'confidential', verified: false, ttlDays: 30 };
function setup(allowed = true) {
  const repository = { remember: vi.fn().mockResolvedValue({ record: {}, contradictions: [] }), recall: vi.fn().mockResolvedValue([]), touch: vi.fn(), review: vi.fn(), deleteOne: vi.fn(), deleteForSubject: vi.fn() };
  const consent = { evaluate: vi.fn().mockResolvedValue({ allowed, reason: allowed ? 'consent_granted' : 'withdrawn', policyVersionId: allowed ? id : undefined, evaluatedAt: new Date() }) };
  return { repository, consent, service: new AiMemoryService(repository as never, consent as never, new MemoryExtractionPolicy(), new PiiRedactionService()) };
}

describe('privacy-aware AI memory', () => {
  it('requires consent and explicit long-term policy eligibility', async () => {
    const denied = setup(false);
    await expect(denied.service.extract({ workspaceId: id, origin: 'trusted_extractor', policyEligible: true, redactPii: true, candidate })).rejects.toThrow('withdrawn');
    const ineligible = setup();
    await expect(ineligible.service.extract({ workspaceId: id, origin: 'trusted_extractor', policyEligible: false, redactPii: true, candidate })).rejects.toThrow('policy eligible');
    expect(ineligible.repository.remember).not.toHaveBeenCalled();
  });

  it('redacts configured PII and prohibits unrestricted model writes', async () => {
    const value = setup();
    await value.service.extract({ workspaceId: id, origin: 'trusted_extractor', policyEligible: true, redactPii: true, candidate });
    expect(value.repository.remember).toHaveBeenCalledWith(expect.objectContaining({ workspaceId: id, content: 'Email me at [EMAIL]', normalizedSummary: 'Prefers email at [EMAIL]', confidence: 0.8 }));
    expect(() => new MemoryExtractionPolicy().validate(candidate, 'model' as never)).toThrow('Direct model');
  });

  it('excludes expired memory even if a persistence adapter returns it', async () => {
    const value = setup(), expired = { _id: id, normalizedSummary: 'expired', verified: true, confidence: 1, source: { occurredAt: new Date() }, retentionExpiry: new Date(Date.now() - 1), status: 'active' };
    value.repository.recall.mockResolvedValue([expired]);
    await expect(value.service.recall({ workspaceId: id, subjectId: id })).resolves.toEqual({ memories: [], usedTokens: 0 });
    expect(isRetrievable(expired)).toBe(false);
  });

  it('detects contradictions and prefers recent verified memory', () => {
    const olderVerified = { verified: true, confidence: 0.7, source: { occurredAt: new Date('2026-01-01') } }, newerVerified = { verified: true, confidence: 0.7, source: { occurredAt: new Date('2026-02-01') } }, unverified = { verified: false, confidence: 1, source: { occurredAt: new Date('2026-03-01') } };
    expect(shouldSupersede(unverified, [olderVerified])).toBe(false);
    expect(shouldSupersede(newerVerified, [olderVerified])).toBe(true);
  });

  it('binds retrieval, review, and deletion to workspace and subject', async () => {
    const value = setup(), otherWorkspace = '507f191e810c19729de860ea';
    await value.service.recall({ workspaceId: otherWorkspace, subjectId: id, maxMemories: 500, maxTokens: 50 });
    expect(value.repository.recall).toHaveBeenCalledWith(expect.objectContaining({ workspaceId: otherWorkspace, subjectId: id, limit: 20 }));
    await value.service.delete(otherWorkspace, id, '507f1f77bcf86cd799439099');
    expect(value.repository.deleteOne).toHaveBeenCalledWith(otherWorkspace, id, '507f1f77bcf86cd799439099');
  });
});
