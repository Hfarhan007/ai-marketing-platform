import { randomUUID } from 'node:crypto';
import type Redis from 'ioredis';
export class DistributedLock {
  constructor(
    private readonly redis: Redis,
    private readonly prefix: string,
  ) {}
  async acquire(key: string, ttlMs: number) {
    const token = randomUUID(),
      locked = await this.redis.set(`${this.prefix}:lock:${key}`, token, 'PX', ttlMs, 'NX');
    return locked === 'OK' ? token : null;
  }
  async release(key: string, token: string) {
    await this.redis.eval(
      "if redis.call('get',KEYS[1])==ARGV[1] then return redis.call('del',KEYS[1]) else return 0 end",
      1,
      `${this.prefix}:lock:${key}`,
      token,
    );
  }
}
