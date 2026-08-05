import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService, type HealthCheckResult, type HealthIndicatorResult } from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';
import { MongoHealthIndicator } from '../database/mongo/mongo.health.js';
import { Public } from '../common/decorators/public.decorator.js';
import { RedisHealthIndicator } from './redis-health.indicator.js';
import { MetricsService } from '../observability/metrics.service.js';

@ApiTags('health')
@SkipThrottle()
@Public()
@Controller('health')
export class HealthController {
  constructor(
    @Inject(HealthCheckService) private readonly health: HealthCheckService,
    @Inject(MongoHealthIndicator) private readonly mongo: MongoHealthIndicator,
    @Inject(RedisHealthIndicator) private readonly redis: RedisHealthIndicator,
    @Inject(MetricsService) private readonly metrics: MetricsService,
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
      () => this.measured('mongodb', () => this.mongo.isHealthy('mongodb')),
      () => this.measured('redis', () => this.redis.isHealthy('redis')),
    ]);
  }

  private async measured(kind: 'mongodb' | 'redis', check: () => Promise<HealthIndicatorResult>): Promise<HealthIndicatorResult> {
    const started = performance.now();
    const result = await check();
    const healthy = Object.values(result).every((detail) => detail.status === 'up');
    this.metrics.observeDependency(kind, healthy, performance.now() - started);
    return result;
  }
}
