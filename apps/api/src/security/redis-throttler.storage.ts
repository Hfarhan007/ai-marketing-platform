import { Inject, Injectable } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../cache/redis.constants.js';

const INCREMENT_SCRIPT = `
local hitsKey = KEYS[1]
local blockKey = KEYS[2]
local ttl = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local blockDuration = tonumber(ARGV[3])
local blockedTtl = redis.call('PTTL', blockKey)
if blockedTtl > 0 then
  local hits = tonumber(redis.call('GET', hitsKey) or limit)
  return {hits, redis.call('PTTL', hitsKey), 1, blockedTtl}
end
local hits = redis.call('INCR', hitsKey)
if hits == 1 then redis.call('PEXPIRE', hitsKey, ttl) end
local hitsTtl = redis.call('PTTL', hitsKey)
if hits > limit then
  redis.call('SET', blockKey, '1', 'PX', blockDuration)
  return {hits, hitsTtl, 1, blockDuration}
end
return {hits, hitsTtl, 0, 0}
`;

interface RateLimitRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<RateLimitRecord> {
    if (this.redis.status === 'wait') await this.redis.connect();
    const result: unknown = await this.redis.eval(
      INCREMENT_SCRIPT,
      2,
      `rate-limit:${throttlerName}:${key}`,
      `rate-limit:${throttlerName}:${key}:blocked`,
      ttl,
      limit,
      blockDuration || ttl,
    );
    if (!this.isNumericTuple(result)) {
      throw new Error('Redis returned an invalid rate-limit result');
    }
    return {
      totalHits: result[0],
      timeToExpire: Math.max(result[1], 0),
      isBlocked: result[2] === 1,
      timeToBlockExpire: Math.max(result[3], 0),
    };
  }

  private isNumericTuple(value: unknown): value is [number, number, number, number] {
    return Array.isArray(value) && value.length === 4 && value.every((item) => typeof item === 'number');
  }
}
