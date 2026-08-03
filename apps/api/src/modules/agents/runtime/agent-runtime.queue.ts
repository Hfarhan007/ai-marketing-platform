import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Job, Queue } from 'bullmq';
import { AgentRuntimeService } from './agent-runtime.service.js';
import { ClassifiedAgentError } from './agent-runtime.types.js';

export const AGENT_RUN_QUEUE = 'agent-runs';

@Injectable()
export class AgentRunQueueService {
  constructor(@InjectQueue(AGENT_RUN_QUEUE) private readonly queue: Queue) {}
  enqueue(runId: string) { return this.queue.add('resume', { runId }, { jobId: runId, attempts: 5, backoff: { type: 'exponential', delay: 1000 }, removeOnComplete: true }); }
  resumeAfterApproval(runId: string, stepKey: string) { return this.queue.add('resume', { runId, stepKey }, { jobId: `${runId}:approval:${stepKey}`, attempts: 5, backoff: { type: 'exponential', delay: 1000 } }); }
}

@Processor(AGENT_RUN_QUEUE, { concurrency: 10, lockDuration: 60_000, maxStalledCount: 3 })
export class AgentRunWorker extends WorkerHost {
  constructor(private readonly runtime: AgentRuntimeService) { super(); }
  async process(job: Job<{ runId: string }>) {
    try {
      const run = await this.runtime.resume(job.data.runId);
      await job.updateProgress({ state: run.state });
      return { runId: run.id, state: run.state };
    } catch (error) {
      if (error instanceof ClassifiedAgentError && error.classification === 'non_retryable') job.discard();
      throw error;
    }
  }
}
