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
  scopedKey(scope: { workspaceId: string; feature: string; dataClassification: string; version?: string }, value: unknown, mode: 'exact' | 'semantic' = 'exact') {
    const boundary = this.key(scope).slice(-64), normalized = mode === 'semantic' && typeof value === 'string' ? value.toLowerCase().replace(/[^a-z0-9\s]/gu, '').replace(/\s+/gu, ' ').trim() : value;
    return `ai:${mode}:${boundary}:${this.key(normalized).slice(-64)}`;
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
  async invalidate(scope: { workspaceId: string; feature: string; dataClassification: string; version?: string }) {
    const boundary = this.key(scope).slice(-64), keys = await this.redis.keys(`ai:*:${boundary}:*`);
    if (keys.length) await this.redis.del(...keys);
    return keys.length;
  }
}
