import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService, type HealthCheckResult } from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';
import { MongoHealthIndicator } from '../database/mongo/mongo.health.js';
import { Public } from '../common/decorators/public.decorator.js';
import { RedisHealthIndicator } from './redis-health.indicator.js';

@ApiTags('health')
@SkipThrottle()
@Public()
@Controller('health')
export class HealthController {
  constructor(
    @Inject(HealthCheckService) private readonly health: HealthCheckService,
    @Inject(MongoHealthIndicator) private readonly mongo: MongoHealthIndicator,
    @Inject(RedisHealthIndicator) private readonly redis: RedisHealthIndicator,
  ) {}

  @Get('live')
  @HealthCheck()
  @ApiOperation({ summary: 'Process liveness probe' })
  live(): Promise<HealthCheckResult> {
    return this.health.check([]);
  }

  @Get('ready')
  @HealthCheck()
  @ApiOperation({ summary: 'Dependency readiness probe' })
  ready(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.mongo.isHealthy('mongodb'),
      () => this.redis.isHealthy('redis'),
    ]);
  }
}
