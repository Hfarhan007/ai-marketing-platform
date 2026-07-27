import { Inject, Injectable } from '@nestjs/common';
import { HealthIndicatorService, type HealthIndicatorResult } from '@nestjs/terminus';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../cache/redis.constants.js';

@Injectable()
export class RedisHealthIndicator {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly indicator: HealthIndicatorService,
  ) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const check = this.indicator.check(key);
    try {
      if (this.redis.status === 'wait') await this.redis.connect();
      await this.redis.ping();
      return check.up();
    } catch (error: unknown) {
      return check.down({ message: error instanceof Error ? error.message : 'Redis unavailable' });
    }
  }
}
