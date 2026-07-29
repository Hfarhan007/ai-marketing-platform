import { monitorEventLoopDelay } from 'node:perf_hooks';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

export function registerRequestProtection(
  app: NestFastifyApplication,
  options: {
    timeoutMs: number;
    maxInflight: number;
    maxEventLoopLagMs: number;
  },
) {
  let inflight = 0;
  const admitted = new WeakSet<object>();
  const lag = monitorEventLoopDelay({ resolution: 20 });
  lag.enable();
  const server = app.getHttpAdapter().getInstance();
  server.addHook('onRequest', (request, reply, done) => {
    const liveOrReady = request.url.startsWith('/health/');
    const overloaded =
      inflight >= options.maxInflight || lag.mean / 1_000_000 >= options.maxEventLoopLagMs;
    if (!liveOrReady && overloaded) {
      reply.header('retry-after', '1').code(503).send({
        statusCode: 503,
        code: 'LOAD_SHED',
        message: 'Server is temporarily overloaded',
      });
      return;
    }
    inflight += 1;
    admitted.add(request);
    request.raw.setTimeout(options.timeoutMs);
    done();
  });
  server.addHook('onResponse', (request, _reply, done) => {
    if (admitted.delete(request)) inflight = Math.max(0, inflight - 1);
    done();
  });
  app.enableShutdownHooks();
  return () => lag.disable();
}
