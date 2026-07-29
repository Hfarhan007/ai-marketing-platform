import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../../../cache/redis.constants.js';
import type { AiResponse } from '../providers/ai-provider.interface.js';
@Injectable()
export class AiCacheService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}
  key(value: unknown) {
    return `ai:deterministic:${createHash('sha256').update(JSON.stringify(value)).digest('hex')}`;
  }
  async get(key: string) {
    try {
      const v = await this.redis.get(key);
      return v ? (JSON.parse(v) as AiResponse) : null;
    } catch {
      return null;
    }
  }
  async set(key: string, value: AiResponse) {
    await this.redis.set(key, JSON.stringify(value), 'EX', 3600).catch(() => undefined);
  }
}
