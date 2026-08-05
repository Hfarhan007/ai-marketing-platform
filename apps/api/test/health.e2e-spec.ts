import 'reflect-metadata';
import { Module } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { TerminusModule } from '@nestjs/terminus';
import supertest from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { registerCorrelationIdHook } from '../src/common/middleware/correlation-id.middleware.js';
import { HealthController } from '../src/health/health.controller.js';
import { RedisHealthIndicator } from '../src/health/redis-health.indicator.js';
import { MongoHealthIndicator } from '../src/database/mongo/mongo.health.js';
import { MetricsService } from '../src/observability/metrics.service.js';
import { createTestApplication } from './support/nest-test-application.js';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [
    { provide: MongoHealthIndicator, useValue: { isHealthy: vi.fn() } },
    { provide: RedisHealthIndicator, useValue: { isHealthy: vi.fn() } },
    { provide: MetricsService, useValue: { observeDependency: vi.fn() } },
  ],
})
class TestHealthModule {}

describe('health endpoints (e2e)', () => {
  let app: NestFastifyApplication;
  let http: ReturnType<typeof supertest>;

  beforeAll(async () => {
    const testApplication = await createTestApplication(TestHealthModule, undefined, registerCorrelationIdHook);
    app = testApplication.app;
    http = testApplication.http;
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves liveness through the configured test API and returns a correlation ID', async () => {
    const response = await http.get('/api/v1/health/live').expect(200);
    expect(response.headers['x-request-id']).toBeTypeOf('string');
    expect(response.body).toMatchObject({ status: 'ok' });
  });

  it('does not expose an unprefixed duplicate health route', async () => {
    await http.get('/health/live').expect(404);
  });
});
