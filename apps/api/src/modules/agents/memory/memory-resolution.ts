export interface ComparableMemory { verified: boolean; confidence: number; source: { occurredAt: Date }; retentionExpiry?: Date; status?: string }
export function shouldSupersede(candidate: ComparableMemory, existing: readonly ComparableMemory[]) {
  if (!existing.length) return true;
  const best = [...existing].sort((a, b) => Number(b.verified) - Number(a.verified) || b.source.occurredAt.valueOf() - a.source.occurredAt.valueOf() || b.confidence - a.confidence)[0]!;
  if (candidate.verified !== best.verified) return candidate.verified;
  if (candidate.source.occurredAt.valueOf() !== best.source.occurredAt.valueOf()) return candidate.source.occurredAt > best.source.occurredAt;
  return candidate.confidence >= best.confidence;
}
export function isRetrievable(memory: ComparableMemory, now = new Date()) { return memory.status === 'active' && Boolean(memory.retentionExpiry && memory.retentionExpiry > now); }
