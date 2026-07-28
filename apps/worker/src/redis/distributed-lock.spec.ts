import { describe, expect, it, vi } from 'vitest';
import { DistributedLock } from './distributed-lock.js';

describe('DistributedLock', () => {
  it('uses an owner token and atomic Redis release', async () => {
    const redis = {
      set: vi.fn().mockResolvedValue('OK'),
      eval: vi.fn().mockResolvedValue(1),
    };
    const lock = new DistributedLock(redis as never, 'test');
    const token = await lock.acquire('job', 1000);
    expect(token).toBeTruthy();
    expect(redis.set).toHaveBeenCalledWith('test:lock:job', token, 'PX', 1000, 'NX');
    await lock.release('job', token!);
    expect(redis.eval).toHaveBeenCalledWith(
      expect.stringContaining("redis.call('get'"),
      1,
      'test:lock:job',
      token,
    );
  });

  it('returns null when another worker owns the lock', async () => {
    const lock = new DistributedLock({ set: vi.fn().mockResolvedValue(null) } as never, 'test');
    await expect(lock.acquire('job', 1000)).resolves.toBeNull();
  });
});
