import type Redis from 'ioredis';
import { DistributedLock } from '../redis/distributed-lock.js';
export class ExecutionGuard {
  private readonly locks: DistributedLock;
  constructor(
    private readonly redis: Redis,
    private readonly prefix: string,
    private readonly workspaceLimit: number,
  ) {
    this.locks = new DistributedLock(redis, prefix);
  }
  async execute<T>(
    workspaceId: string,
    idempotencyKey: string,
    ttlMs: number,
    work: () => Promise<T>,
  ): Promise<{ duplicate: boolean; value?: T }> {
    const doneKey = `${this.prefix}:done:${workspaceId}:${idempotencyKey}`;
    if (await this.redis.exists(doneKey)) return { duplicate: true };
    const token = await this.locks.acquire(`job:${workspaceId}:${idempotencyKey}`, ttlMs);
    if (!token) return { duplicate: true };
    const activeKey = `${this.prefix}:active:${workspaceId}`;
    const active = await this.redis.incr(activeKey);
    await this.redis.pexpire(activeKey, ttlMs);
    if (active > this.workspaceLimit) {
      await this.redis.decr(activeKey);
      await this.locks.release(`job:${workspaceId}:${idempotencyKey}`, token);
      throw new Error('WORKSPACE_CONCURRENCY_LIMIT');
    }
    try {
      const value = await work();
      await this.redis.set(doneKey, '1', 'PX', 86_400_000);
      return { duplicate: false, value };
    } finally {
      await this.redis.decr(activeKey);
      await this.locks.release(`job:${workspaceId}:${idempotencyKey}`, token);
    }
  }
}
