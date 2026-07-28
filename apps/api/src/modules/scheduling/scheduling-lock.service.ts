import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../../cache/redis.constants.js';

@Injectable()
export class SchedulingLockService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}
  async run<T>(workspaceId: string, staffId: string, operation: () => Promise<T>): Promise<T> {
    const key = `lock:scheduling:${workspaceId}:${staffId}`;
    const token = randomUUID();
    const acquired = await this.redis.set(key, token, 'PX', 15_000, 'NX');
    if (acquired !== 'OK') throw new ServiceUnavailableException('Scheduling is busy; retry this request');
    try { return await operation(); }
    finally {
      await this.redis.eval('if redis.call("get",KEYS[1])==ARGV[1] then return redis.call("del",KEYS[1]) else return 0 end', 1, key, token);
    }
  }
}
