import { randomBytes, randomUUID } from 'node:crypto';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { CORRELATION_ID_HEADER, REQUEST_ID_HEADER, TRACE_PARENT_HEADER } from '../constants/application.constants.js';

interface CorrelationRequest {
  correlationId?: string;
  requestId?: string;
  traceId?: string;
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
    const requestId = safeIdentifier(request.headers[REQUEST_ID_HEADER]) ?? randomUUID();
    const correlationId = safeIdentifier(request.headers[CORRELATION_ID_HEADER]) ?? requestId;
    const incomingTrace = validTraceParent(request.headers[TRACE_PARENT_HEADER]);
    const traceId = incomingTrace?.split('-')[1] ?? randomBytes(16).toString('hex');
    const traceParent = `00-${traceId}-${randomBytes(8).toString('hex')}-01`;
    request.requestId = requestId;
    request.correlationId = correlationId;
    request.traceId = traceId;
    reply.header(REQUEST_ID_HEADER, requestId);
    reply.header(CORRELATION_ID_HEADER, correlationId);
    reply.header(TRACE_PARENT_HEADER, traceParent);
    done();
  });
}

export function safeIdentifier(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' && /^[A-Za-z0-9._:-]{1,128}$/.test(value) ? value : undefined;
}

export function validTraceParent(value: string | string[] | undefined): string | undefined {
  if (typeof value !== 'string') return undefined;
  return /^00-[0-9a-f]{32}-[0-9a-f]{16}-0[01]$/.test(value) && !value.includes('0000000000000000')
    ? value
    : undefined;
}
