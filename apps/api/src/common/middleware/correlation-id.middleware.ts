import { randomUUID } from 'node:crypto';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { REQUEST_ID_HEADER } from '../constants/application.constants.js';

interface CorrelationRequest {
  correlationId?: string;
  headers: Record<string, string | string[] | undefined>;
}

interface CorrelationReply {
  header(name: string, value: string): void;
}

interface FastifyHookServer {
  addHook(
    name: 'onRequest',
    hook: (request: CorrelationRequest, reply: CorrelationReply, done: () => void) => void,
  ): void;
}

export function registerCorrelationIdHook(app: NestFastifyApplication): void {
  const server = app.getHttpAdapter().getInstance() as unknown as FastifyHookServer;
  server.addHook('onRequest', (request, reply, done) => {
    const candidate = request.headers[REQUEST_ID_HEADER];
    const correlationId =
      typeof candidate === 'string' && candidate.length <= 128 ? candidate : randomUUID();
    request.correlationId = correlationId;
    reply.header(REQUEST_ID_HEADER, correlationId);
    done();
  });
}
