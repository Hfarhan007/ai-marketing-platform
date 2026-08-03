import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Injectable } from '@nestjs/common';
import type { Job, Queue } from 'bullmq';
import type { Redis } from 'ioredis';
import { randomUUID } from 'node:crypto';
import type { AiRequestCommand } from './ai-execution.types.js';
import { AiControlPlaneService } from './ai-control-plane.service.js';
import { PiiRedactionService } from '../safety/pii-redaction.service.js';
import { REDIS_CLIENT } from '../../../cache/redis.constants.js';
export const AI_EXECUTION_QUEUE = 'ai-execution';
type AsyncCommand = Omit<AiRequestCommand, 'deadline' | 'queuedAt' | 'signal'> & { deadline: string; queuedAt: string };
@Injectable()
export class AiAsyncExecutionService {
  constructor(@InjectQueue(AI_EXECUTION_QUEUE) private readonly queue: Queue<AsyncCommand>, private readonly redaction: PiiRedactionService, @Inject(REDIS_CLIENT) private readonly redis: Redis) {}
  async enqueue(command: AiRequestCommand) {
    const requestId = command.requestId ?? randomUUID(), { signal: _signal, deadline, ...serializable } = command;
    void _signal;
    const protectedCommand = { ...serializable, messages: serializable.messages?.map((message) => ({ ...message, content: this.redaction.redact(message.content) })), promptVariables: serializable.promptVariables ? Object.fromEntries(Object.entries(serializable.promptVariables).map(([key, value]) => [key, typeof value === 'string' ? this.redaction.redact(value) : value])) : undefined };
    const priority = { critical: 1, interactive: 5, normal: 10, batch: 20 }[command.priority ?? 'normal'];
    await this.queue.add('execute', { ...protectedCommand, requestId, deadline: deadline.toISOString(), queuedAt: new Date().toISOString() } as AsyncCommand, { jobId: requestId, priority, removeOnComplete: 1_000, removeOnFail: 5_000 });
    return { requestId, status: 'queued' as const };
  }
  cancel(requestId: string) { return this.queue.getJob(requestId).then(async (job) => { await this.redis.set(`ai:cancel:${requestId}`, '1', 'EX', 600); if (job && !['active', 'completed'].includes(await job.getState())) await job.remove(); return { requestId, cancellationRequested: true }; }); }
}
@Processor(AI_EXECUTION_QUEUE)
export class AiExecutionProcessor extends WorkerHost {
  constructor(private readonly controlPlane: AiControlPlaneService, @Inject(REDIS_CLIENT) private readonly redis: Redis) { super(); }
  async process(job: Job<AsyncCommand>) {
    const controller = new AbortController(), requestId = job.data.requestId!;
    if (await this.redis.get(`ai:cancel:${requestId}`)) controller.abort(new Error('AI execution cancelled'));
    const poll = setInterval(() => void this.redis.get(`ai:cancel:${requestId}`).then((value) => { if (value) controller.abort(new Error('AI execution cancelled')); }), 250);
    try { return await this.controlPlane.execute({ ...job.data, deadline: new Date(job.data.deadline), queuedAt: new Date(job.data.queuedAt), signal: controller.signal }); }
    finally { clearInterval(poll); }
  }
}
