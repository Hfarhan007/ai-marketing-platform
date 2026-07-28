import { describe, expect, it } from 'vitest';
import { DEFAULT_JOB_OPTIONS } from './queue-registry.js';
describe('queue retry policy', () => {
  it('uses bounded exponential retries', () => {
    expect(DEFAULT_JOB_OPTIONS.attempts).toBe(5);
    expect(DEFAULT_JOB_OPTIONS.backoff).toEqual({ type: 'exponential', delay: 1000 });
  });
});
