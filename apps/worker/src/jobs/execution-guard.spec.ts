import { describe, expect, it, vi } from 'vitest';
import { ExecutionGuard } from './execution-guard.js';
function redis(existing = 0) {
  return {
    exists: vi.fn().mockResolvedValue(existing),
    set: vi.fn().mockResolvedValue('OK'),
    eval: vi.fn().mockResolvedValue(1),
    incr: vi.fn().mockResolvedValue(1),
    decr: vi.fn().mockResolvedValue(0),
    pexpire: vi.fn().mockResolvedValue(1),
  };
}
describe('ExecutionGuard', () => {
  it('skips completed idempotency keys', async () => {
    const client = redis(1),
      work = vi.fn(),
      guard = new ExecutionGuard(client as never, 'test', 2);
    await expect(guard.execute('w', 'same', 1000, work)).resolves.toEqual({ duplicate: true });
    expect(work).not.toHaveBeenCalled();
  });
  it('executes once while holding a workspace slot', async () => {
    const client = redis(),
      guard = new ExecutionGuard(client as never, 'test', 2);
    await expect(guard.execute('w', 'new', 1000, () => Promise.resolve(42))).resolves.toEqual({
      duplicate: false,
      value: 42,
    });
    expect(client.decr).toHaveBeenCalledWith('test:active:w');
  });
});
