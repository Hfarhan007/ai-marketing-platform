import type { HealthCheckResult, HealthCheckService } from '@nestjs/terminus';
import { describe, expect, it, vi } from 'vitest';
import type { MongoHealthIndicator } from '../database/mongo/mongo.health.js';
import { HealthController } from './health.controller.js';
import type { RedisHealthIndicator } from './redis-health.indicator.js';

const healthy: HealthCheckResult = { status: 'ok', info: {}, error: {}, details: {} };

describe('HealthController', () => {
  it('returns liveness without checking external dependencies', async () => {
    const check = vi.fn().mockResolvedValue(healthy);
    const controller = new HealthController(
      { check } as unknown as HealthCheckService,
      {} as MongoHealthIndicator,
      {} as RedisHealthIndicator,
    );
    await expect(controller.live()).resolves.toEqual(healthy);
    expect(check).toHaveBeenCalledWith([]);
  });

  it('registers MongoDB and Redis readiness checks', async () => {
    const check = vi.fn().mockResolvedValue(healthy);
    const controller = new HealthController(
      { check } as unknown as HealthCheckService,
      { isHealthy: vi.fn() } as unknown as MongoHealthIndicator,
      { isHealthy: vi.fn() } as unknown as RedisHealthIndicator,
    );
    await controller.ready();
    const checks = check.mock.calls[0]?.[0] as unknown[];
    expect(checks).toHaveLength(2);
  });
});
