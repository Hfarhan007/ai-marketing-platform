import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from './redis.constants.js';
import { RedisLifecycleService } from './redis-lifecycle.service.js';

@Module({
  providers: [
    RedisLifecycleService,
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Redis =>
        new Redis(config.getOrThrow<string>('redis.url'), {
          enableOfflineQueue: false,
          lazyConnect: true,
          enableReadyCheck: true,
          maxRetriesPerRequest: 2,
          connectTimeout: 5_000,
          commandTimeout: 2_000,
          keepAlive: 10_000,
          retryStrategy: (attempt) => Math.min(2_000, 50 * 2 ** Math.min(attempt, 6)),
          reconnectOnError: (error) =>
            /READONLY|ECONNRESET|ETIMEDOUT/u.test(error.message) ? 1 : false,
        }),
    },
  ],
  exports: [REDIS_CLIENT],
})
export class CacheModule {}
