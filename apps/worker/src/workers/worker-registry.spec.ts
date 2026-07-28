import { describe, expect, it } from 'vitest';
import { shouldDeadLetter } from './worker-registry.js';
describe('dead-letter handling', () => {
  it('moves only exhausted jobs', () => {
    expect(shouldDeadLetter({ attemptsMade: 5, opts: { attempts: 5 } })).toBe(true);
    expect(shouldDeadLetter({ attemptsMade: 2, opts: { attempts: 5 } })).toBe(false);
  });
});
