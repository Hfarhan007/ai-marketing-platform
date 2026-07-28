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

export async function bootstrap(): Promise<NestFastifyApplication> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      trustProxy: process.env.TRUST_PROXY === 'true',
      bodyLimit: Number(process.env.STORAGE_MAX_FILE_SIZE_BYTES ?? 52_428_800),
    }),
    { bufferLogs: true, rawBody: true },
  );
  const config = app.get(ConfigService);
  registerCorrelationIdHook(app);
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
  await app.register(helmet);
  await app.register(cors, {
    credentials: true,
    origin: config.getOrThrow<string[]>('app.corsOrigins'),
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

if (process.env.NODE_ENV !== 'test') void bootstrap();
