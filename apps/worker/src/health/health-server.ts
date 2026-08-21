import { createServer, type Server } from 'node:http';
import type Redis from 'ioredis';
import type mongoose from 'mongoose';
import type { Logger } from '../logging.js';
import type { QueueRegistry } from '../queues/queue-registry.js';
export class HealthServer {
  private server?: Server;
  constructor(
    private readonly port: number,
    private readonly redis: Redis,
    private readonly mongo: typeof mongoose,
    private readonly queues: QueueRegistry,
    private readonly logger: Logger,
  ) {}
  start() {
    this.server = createServer(
      (request, response) => void this.handle(request.url ?? '/', response),
    );
    this.server.listen(this.port, () =>
      this.logger.info({ port: this.port }, 'worker health server listening'),
    );
  }
  private async handle(path: string, response: import('node:http').ServerResponse) {
    response.setHeader('content-type', 'application/json');
    if (path === '/health/live') {
      response.end(JSON.stringify({ status: 'ok' }));
      return;
    }
    if (path === '/health/ready') {
      const redis = this.redis.status === 'ready',
        mongo = this.mongo.connection.readyState === this.mongo.ConnectionStates.connected;
      response.statusCode = redis && mongo ? 200 : 503;
      response.end(
        JSON.stringify({
          status: redis && mongo ? 'ready' : 'not_ready',
          checks: { redis, mongo },
        }),
      );
      return;
    }
    if (path === '/metrics') {
      const queues = await Promise.all(
        this.queues
          .entries()
          .map(async ([name, queue]) => ({
            name,
            ...(await queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed')),
          })),
      );
      response.end(JSON.stringify({ queues, timestamp: new Date().toISOString() }));
      return;
    }
    if (path === '/failed-jobs') {
      const jobs = await this.queues.deadLetter.getJobs(['waiting', 'delayed', 'completed', 'failed'], 0, 99, false);
      response.end(JSON.stringify({ jobs: jobs.map((job) => ({ id: job.id, name: job.name, data: job.data, failedReason: job.failedReason, timestamp: job.timestamp })) }));
      return;
    }
    response.statusCode = 404;
    response.end(JSON.stringify({ error: 'not_found' }));
  }
  close() {
    return new Promise<void>((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }
      this.server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}
