import cookie from '@fastify/cookie';
import { ValidationPipe, type Type } from '@nestjs/common';
import { Test, type TestingModuleBuilder } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import supertest from 'supertest';
import { API_PREFIX } from '../../src/common/constants/application.constants.js';

export interface TestApplication { app: NestFastifyApplication; http: ReturnType<typeof supertest>; close(): Promise<void> }

export async function createTestApplication(rootModule: Type<unknown>, customize?: (builder: TestingModuleBuilder) => TestingModuleBuilder, configure?: (app: NestFastifyApplication) => void | Promise<void>): Promise<TestApplication> {
  let builder = Test.createTestingModule({ imports: [rootModule] });
  if (customize) builder = customize(builder);
  const module = await builder.compile();
  const app = module.createNestApplication<NestFastifyApplication>(new FastifyAdapter(), { logger: false });
  await app.register(cookie);
  app.setGlobalPrefix(API_PREFIX);
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true, forbidUnknownValues: true }));
  await configure?.(app);
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return { app, http: supertest(app.getHttpServer()), close: () => app.close() };
}
