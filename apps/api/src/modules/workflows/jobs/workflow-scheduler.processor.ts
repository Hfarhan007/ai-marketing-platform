import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Job } from 'bullmq';
import { WORKFLOW_SCHEDULER_QUEUE } from '../services/workflow-scheduler.service.js';
import { WorkflowService } from '../services/workflow.service.js';
interface ScheduledWorkflow {
  workspaceId: string;
  definitionId: string;
}
@Injectable()
@Processor(WORKFLOW_SCHEDULER_QUEUE)
export class WorkflowSchedulerProcessor extends WorkerHost {
  constructor(private readonly workflows: WorkflowService) {
    super();
  }
  async process(job: Job<ScheduledWorkflow>): Promise<void> {
    await this.workflows.trigger(job.data.workspaceId, job.data.definitionId, 'trigger.schedule', {
      idempotencyKey: `schedule:${String(job.id)}`,
      correlationId: `schedule:${String(job.id)}`,
      input: { scheduledAt: new Date().toISOString() },
    });
  }
}
