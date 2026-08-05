import 'reflect-metadata';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger, PinoLogger } from 'nestjs-pino';
import { AppModule } from './app.module.js';
import { API_PREFIX, OPENAPI_PATH } from './common/constants/application.constants.js';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter.js';
import { registerCorrelationIdHook } from './common/middleware/correlation-id.middleware.js';
import { registerRequestProtection } from './resilience/request-protection.js';
import { DEFAULT_BODY_LIMIT_BYTES, helmetConfiguration, strictCorsOrigin, trustedProxyConfiguration } from './security/http-security.config.js';

export async function bootstrap(): Promise<NestFastifyApplication> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      trustProxy: trustedProxyConfiguration(process.env.TRUST_PROXY),
      bodyLimit: Number(process.env.STORAGE_MAX_FILE_SIZE_BYTES ?? 52_428_800),
    }),
    { bufferLogs: true, rawBody: true },
  );
  const config = app.get(ConfigService);
  registerBodyLimitHook(app, Number(process.env.APP_MAX_BODY_SIZE_BYTES ?? DEFAULT_BODY_LIMIT_BYTES));
  registerCorrelationIdHook(app);
  registerRequestProtection(app, {
    timeoutMs: Number(process.env.REQUEST_TIMEOUT_MS ?? 30_000),
    maxInflight: Number(process.env.MAX_INFLIGHT_REQUESTS ?? 1_000),
    maxEventLoopLagMs: Number(process.env.MAX_EVENT_LOOP_LAG_MS ?? 250),
  });
  await app.register(cookie);
  app.useLogger(app.get(Logger));
  app.useGlobalFilters(new GlobalExceptionFilter(app.get(PinoLogger)));
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      transform: true,
      whitelist: true,
    }),
  );
  app.setGlobalPrefix(API_PREFIX, { exclude: ['health/live', 'health/ready'] });
  app.enableShutdownHooks();
  await app.register(helmet, helmetConfiguration(config.get<string>('app.environment') === 'production'));
  await app.register(cors, {
    credentials: true,
    allowedHeaders: ['authorization', 'content-type', 'x-correlation-id', 'x-csrf-token', 'x-request-id'],
    exposedHeaders: ['x-correlation-id', 'x-request-id', 'traceparent'],
    maxAge: 600,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    origin: strictCorsOrigin(config.getOrThrow<string[]>('app.corsOrigins')),
  });
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('AI Marketing Platform API')
      .setDescription('Versioned API for the AI Marketing Platform')
      .setVersion('1.0')
      .addBearerAuth()
      .build(),
  );
  SwaggerModule.setup(OPENAPI_PATH, app, document);
  await app.listen({
    host: config.getOrThrow<string>('app.host'),
    port: config.getOrThrow<number>('app.port'),
  });
  return app;
}

function registerBodyLimitHook(app: NestFastifyApplication, limit: number): void {
  const server = app.getHttpAdapter().getInstance() as { addHook(name: 'onRequest', hook: (request: { headers: Record<string, string | string[] | undefined>; url: string }, reply: { code(status: number): { send(body: unknown): void } }, done: () => void) => void): void };
  server.addHook('onRequest', (request, reply, done) => {
    const localUpload = request.url.includes('/files/local-upload/');
    const value = request.headers['content-length'];
    const length = typeof value === 'string' ? Number(value) : 0;
    if (!localUpload && Number.isFinite(length) && length > limit) {
      reply.code(413).send({ statusCode: 413, error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body exceeds configured limit' } });
      return;
    }
    done();
  });
}

if (process.env.NODE_ENV !== 'test') void bootstrap();
