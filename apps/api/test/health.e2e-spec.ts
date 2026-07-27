import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { TerminusModule } from '@nestjs/terminus';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { API_PREFIX } from '../src/common/constants/application.constants.js';
import { registerCorrelationIdHook } from '../src/common/middleware/correlation-id.middleware.js';
import { HealthController } from '../src/health/health.controller.js';
import { RedisHealthIndicator } from '../src/health/redis-health.indicator.js';
import { MongoHealthIndicator } from '../src/database/mongo/mongo.health.js';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [
    { provide: MongoHealthIndicator, useValue: { isHealthy: vi.fn() } },
    { provide: RedisHealthIndicator, useValue: { isHealthy: vi.fn() } },
  ],
})
class TestHealthModule {}

describe('health endpoints (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await NestFactory.create<NestFastifyApplication>(
      TestHealthModule,
      new FastifyAdapter(),
      { logger: false },
    );
    registerCorrelationIdHook(app);
    app.setGlobalPrefix(API_PREFIX, { exclude: ['health/live', 'health/ready'] });
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves liveness outside the versioned prefix and returns a correlation ID', async () => {
    const response = await app.inject({ method: 'GET', url: '/health/live' });
    expect(response.statusCode, response.body).toBe(200);
    expect(response.headers['x-request-id']).toBeTypeOf('string');
    expect(response.json()).toMatchObject({ status: 'ok' });
  });

  it('does not expose health under the business API prefix', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/health/live' });
    expect(response.statusCode).toBe(404);
  });
});
