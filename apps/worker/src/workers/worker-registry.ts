import { context, propagation, trace, SpanStatusCode } from '@opentelemetry/api';
import { UnrecoverableError, Worker, type Job } from 'bullmq';
import type Redis from 'ioredis';
import type { WorkerConfig } from '../config.js';
import { ExecutionGuard } from '../jobs/execution-guard.js';
import {
  parseJobPayload,
  QUEUE_NAMES,
  type JobPayload,
  type QueueName,
} from '../jobs/job.types.js';
import type { Logger } from '../logging.js';
import type { JobProcessor } from '../processors/processors.js';
import { QueueRegistry } from '../queues/queue-registry.js';
export class WorkerRegistry {
  private readonly workers: Worker[] = [];
  private accepting = true;
  constructor(
    private readonly connection: Redis,
    private readonly config: WorkerConfig,
    private readonly queues: QueueRegistry,
    private readonly processors: Record<QueueName, JobProcessor>,
    private readonly logger: Logger,
  ) {}
  start() {
    const guard = new ExecutionGuard(
      this.connection,
      this.config.WORKER_PREFIX,
      this.config.WORKER_WORKSPACE_CONCURRENCY,
    );
    for (const name of QUEUE_NAMES) {
      const worker = new Worker(name, (job) => this.run(name, job, guard), {
        connection: this.connection,
        prefix: this.config.WORKER_PREFIX,
        concurrency: this.config.WORKER_CONCURRENCY,
        lockDuration: Math.max(this.config.WORKER_JOB_TIMEOUT_MS * 2, 30_000),
        stalledInterval: 30_000,
        maxStalledCount: 2,
      });
      worker.on('failed', (job, error) => void this.failed(name, job, error));
      worker.on('error', (error) => this.logger.error({ error, queue: name }, 'worker error'));
      this.workers.push(worker);
    }
  }
  private async run(name: QueueName, job: Job, guard: ExecutionGuard) {
    if (!this.accepting) throw new Error('WORKER_SHUTTING_DOWN');
    let payload: JobPayload;
    try {
      payload = parseJobPayload(name, job.data);
    } catch (error) {
      throw new UnrecoverableError(`INVALID_JOB_PAYLOAD: ${String(error)}`);
    }
    const carrier: Record<string, string> = {};
    if (payload.traceparent) carrier.traceparent = payload.traceparent;
    const parent = propagation.extract(context.active(), carrier),
      tracer = trace.getTracer('ai-marketing-worker');
    return tracer.startActiveSpan(
      `queue.${name}`,
      {
        attributes: {
          'messaging.destination.name': name,
          'job.id': job.id ?? '',
          'workspace.id': payload.workspaceId,
          'correlation.id': payload.correlationId,
        },
      },
      parent,
      async (span) => {
        const controller = new AbortController(),
          timer = setTimeout(() => controller.abort(), this.config.WORKER_JOB_TIMEOUT_MS);
        try {
          const result = await guard.execute(
            payload.workspaceId,
            payload.idempotencyKey,
            this.config.WORKER_JOB_TIMEOUT_MS * 2,
            () =>
              this.processors[name](payload, {
                signal: controller.signal,
                progress: (value) => job.updateProgress(value),
              }),
          );
          span.setStatus({ code: SpanStatusCode.OK });
          return result;
        } catch (error) {
          span.recordException(error instanceof Error ? error : new Error(String(error)));
          span.setStatus({ code: SpanStatusCode.ERROR });
          throw error;
        } finally {
          clearTimeout(timer);
          span.end();
        }
      },
    );
  }
  private async failed(queue: QueueName, job: Job | undefined, error: Error) {
    if (!job || job.attemptsMade < (job.opts.attempts ?? 1)) return;
    await this.queues.deadLetter.add(
      `${queue}:${job.name}`,
      {
        sourceQueue: queue,
        sourceJobId: job.id,
        payload: job.data as unknown,
        error: error.message,
        failedAt: new Date().toISOString(),
      },
      { jobId: `${queue}:${job.id}` },
    );
    this.logger.error(
      {
        queue,
        jobId: job.id,
        correlationId: (job.data as Partial<JobPayload>).correlationId,
        error,
      },
      'job moved to dead letter',
    );
  }
  async close() {
    this.accepting = false;
    await Promise.all(this.workers.map((worker) => worker.close()));
    this.workers.length = 0;
  }
}
export function shouldDeadLetter(
  job: { attemptsMade: number; opts: { attempts?: number } } | undefined,
) {
  return Boolean(job && job.attemptsMade >= (job.opts.attempts ?? 1));
}
