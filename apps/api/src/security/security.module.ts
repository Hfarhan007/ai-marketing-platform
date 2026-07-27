import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { Redis } from 'ioredis';
import { CacheModule } from '../cache/cache.module.js';
import { REDIS_CLIENT } from '../cache/redis.constants.js';
import { RedisThrottlerStorage } from './redis-throttler.storage.js';

@Module({
  imports: [
    CacheModule,
    ThrottlerModule.forRootAsync({
      imports: [CacheModule],
      inject: [ConfigService, REDIS_CLIENT],
      useFactory: (config: ConfigService, redis: Redis) => ({
        storage: new RedisThrottlerStorage(redis),
        throttlers: [{
          name: 'default',
          ttl: config.getOrThrow<number>('app.rateLimit.ttl'),
          limit: config.getOrThrow<number>('app.rateLimit.limit'),
        }],
      }),
    }),
  ],
  exports: [ThrottlerModule],
})
export class SecurityModule {}
