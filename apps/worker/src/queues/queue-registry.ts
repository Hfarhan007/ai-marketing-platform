import { Queue, type JobsOptions } from 'bullmq';
import type Redis from 'ioredis';
import { QUEUE_NAMES, type JobPayload, type QueueName } from '../jobs/job.types.js';
export const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 1000 },
  removeOnComplete: { age: 86_400, count: 10_000 },
  removeOnFail: { age: 604_800, count: 50_000 },
};
export class QueueRegistry {
  readonly deadLetter: Queue;
  private readonly queues = new Map<QueueName, Queue>();
  constructor(connection: Redis, prefix: string) {
    for (const name of QUEUE_NAMES)
      this.queues.set(
        name,
        new Queue(name, { connection, prefix, defaultJobOptions: DEFAULT_JOB_OPTIONS }),
      );
    this.deadLetter = new Queue('dead-letter', { connection, prefix });
  }
  get(name: QueueName) {
    const queue = this.queues.get(name);
    if (!queue) throw new Error(`Unknown queue ${name}`);
    return queue;
  }
  add(name: QueueName, jobName: string, payload: JobPayload, options: JobsOptions = {}) {
    return this.get(name).add(jobName, payload, {
      ...options,
      jobId: options.jobId ?? `${payload.workspaceId}:${payload.idempotencyKey}`,
    });
  }
  entries() {
    return [...this.queues.entries()];
  }
  async close() {
    await Promise.all([...this.queues.values(), this.deadLetter].map((queue) => queue.close()));
  }
}
