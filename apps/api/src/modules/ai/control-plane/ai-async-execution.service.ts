import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Job, Queue } from 'bullmq';
import { randomUUID } from 'node:crypto';
import type { AiRequestCommand } from './ai-execution.types.js';
import { AiControlPlaneService } from './ai-control-plane.service.js';
import { PiiRedactionService } from '../safety/pii-redaction.service.js';
export const AI_EXECUTION_QUEUE = 'ai-execution';
type AsyncCommand = Omit<AiRequestCommand, 'deadline' | 'signal'> & { deadline: string };
@Injectable()
export class AiAsyncExecutionService {
  constructor(@InjectQueue(AI_EXECUTION_QUEUE) private readonly queue: Queue<AsyncCommand>, private readonly redaction: PiiRedactionService) {}
  async enqueue(command: AiRequestCommand) {
    const requestId = command.requestId ?? randomUUID(), { signal: _signal, deadline, ...serializable } = command;
    void _signal;
    const protectedCommand = { ...serializable, messages: serializable.messages?.map((message) => ({ ...message, content: this.redaction.redact(message.content) })), promptVariables: serializable.promptVariables ? Object.fromEntries(Object.entries(serializable.promptVariables).map(([key, value]) => [key, typeof value === 'string' ? this.redaction.redact(value) : value])) : undefined };
    await this.queue.add('execute', { ...protectedCommand, requestId, deadline: deadline.toISOString() } as AsyncCommand, { jobId: requestId, removeOnComplete: 1_000, removeOnFail: 5_000 });
    return { requestId, status: 'queued' as const };
  }
  cancel(requestId: string) { return this.queue.getJob(requestId).then(async (job) => { if (job) await job.remove(); return { requestId, cancelled: Boolean(job) }; }); }
}
@Processor(AI_EXECUTION_QUEUE)
export class AiExecutionProcessor extends WorkerHost {
  constructor(private readonly controlPlane: AiControlPlaneService) { super(); }
  process(job: Job<AsyncCommand>) {
    return this.controlPlane.execute({ ...job.data, deadline: new Date(job.data.deadline) });
  }
}
