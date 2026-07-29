import { describe, expect, it } from 'vitest';
import {
  deletionProgressStatus,
  hasApplicableLegalHold,
  retryableStages,
  type ManifestStage,
  type StageStatus,
} from './data-lifecycle.types.js';

const stages = (
  overrides: Partial<Record<ManifestStage, StageStatus>> = {},
): Record<ManifestStage, StageStatus> => ({
  object_storage: 'pending',
  vector_index: 'pending',
  cache: 'pending',
  mongodb: 'pending',
  ...overrides,
});

describe('data lifecycle safety', () => {
  it('blocks both workspace-wide and record legal holds but ignores released holds', () => {
    const holds = [
      { dataClass: 'contacts' as const, recordId: null, releasedAt: null },
      {
        dataClass: 'files' as const,
        recordId: 'file-1',
        releasedAt: new Date('2026-01-01'),
      },
    ];
    expect(hasApplicableLegalHold(holds, 'contacts', 'contact-1')).toBe(true);
    expect(hasApplicableLegalHold(holds, 'files', 'file-1')).toBe(false);
    expect(hasApplicableLegalHold(holds, 'messages', 'message-1')).toBe(false);
  });

  it('retries only pending or failed stages and never repeats completed deletion work', () => {
    expect(
      retryableStages(
        stages({
          object_storage: 'completed',
          vector_index: 'not_applicable',
          cache: 'failed',
          mongodb: 'pending',
        }),
      ),
    ).toEqual(['cache', 'mongodb']);
  });

  it('tracks partial deletion until every applicable subsystem completes', () => {
    expect(
      deletionProgressStatus([
        {
          stages: stages({
            object_storage: 'completed',
            vector_index: 'not_applicable',
            cache: 'failed',
          }),
        },
      ]),
    ).toBe('partial_failure');
    expect(
      deletionProgressStatus([
        {
          stages: stages({
            object_storage: 'completed',
            vector_index: 'not_applicable',
            cache: 'completed',
            mongodb: 'completed',
          }),
        },
      ]),
    ).toBe('completed');
  });
});
