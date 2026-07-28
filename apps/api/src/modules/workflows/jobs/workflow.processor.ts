import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Job } from 'bullmq';
import { Types } from 'mongoose';
import { NodeHandlerRegistry } from '../actions/node-handler.registry.js';
import { WorkflowRepository } from '../repositories/workflow.repository.js';
import type { ExecutionContext, WorkflowGraph, WorkflowJob } from '../types/workflow.types.js';
import { WORKFLOW_QUEUE, WorkflowService } from '../services/workflow.service.js';
@Injectable()
@Processor(WORKFLOW_QUEUE, { concurrency: 50 })
export class WorkflowProcessor extends WorkerHost {
  constructor(
    private readonly repository: WorkflowRepository,
    private readonly handlers: NodeHandlerRegistry,
    private readonly workflows: WorkflowService,
  ) {
    super();
  }
  async process(job: Job<WorkflowJob>): Promise<void> {
    const release = await this.workflows.acquire(job.data.workspaceId);
    try {
      const run = await this.repository.run(job.data.workspaceId, job.data.runId);
      if (!run || ['cancelled', 'paused', 'completed'].includes(run.status)) return;
      const version = await this.repository.versionById(
        job.data.workspaceId,
        String(run.workflowVersionId),
      );
      if (!version) throw new Error('Workflow version missing');
      const graph = version.graph as unknown as WorkflowGraph,
        node = graph.nodes.find((value) => value.id === job.data.nodeId);
      if (!node) throw new Error('Workflow node missing');
      await this.repository.setRun(job.data.workspaceId, job.data.runId, {
        $set: { status: 'running' },
        $inc: { activeJobs: 1 },
      });
      const step = await this.repository.step({
        workspaceId: new Types.ObjectId(job.data.workspaceId),
        workflowRunId: new Types.ObjectId(job.data.runId),
        nodeId: node.id,
        nodeType: node.type,
        status: 'running',
        attempt: job.attemptsMade + 1,
        input: run.variables,
      });
      try {
        const context: ExecutionContext = {
          workspaceId: job.data.workspaceId,
          runId: job.data.runId,
          correlationId: job.data.correlationId,
          input: run.input,
          variables: { ...run.variables },
        };
        const result = await this.handlers.execute(node, context);
        await this.repository.finishStep(String(step._id), {
          $set: {
            status: result.state === 'waiting' ? 'waiting' : 'completed',
            output: result.output ?? {},
            completedAt: new Date(),
          },
        });
        await this.repository.setRun(job.data.workspaceId, job.data.runId, {
          $set: { variables: context.variables },
          $inc: { activeJobs: -1 },
        });
        if (result.state === 'terminated') {
          await this.repository.setRun(job.data.workspaceId, job.data.runId, {
            $set: { status: 'completed', completedAt: new Date() },
          });
          return;
        }
        if (result.state === 'waiting' && result.resumeAt) {
          await this.repository.wait({
            workspaceId: new Types.ObjectId(job.data.workspaceId),
            workflowRunId: new Types.ObjectId(job.data.runId),
            nodeId: node.id,
            resumeAt: result.resumeAt,
          });
          for (const edge of this.next(graph, node.id, result.nextBranch))
            await this.workflows.enqueue(
              { ...job.data, nodeId: edge.target, attempt: 1 },
              Math.max(0, result.resumeAt.valueOf() - Date.now()),
            );
          return;
        }
        const next = this.next(graph, node.id, result.nextBranch);
        if (!next.length) {
          await this.repository.setRun(job.data.workspaceId, job.data.runId, {
            $set: { status: 'completed', completedAt: new Date() },
          });
          return;
        }
        for (const edge of next)
          await this.workflows.enqueue({ ...job.data, nodeId: edge.target, attempt: 1 });
      } catch (error: unknown) {
        const attempts = node.retry?.attempts ?? 3;
        await this.repository.finishStep(String(step._id), {
          $set: {
            status: 'failed',
            errorCode: 'NODE_EXECUTION_FAILED',
            errorMessage: error instanceof Error ? error.message : 'Unknown node failure',
            completedAt: new Date(),
          },
        });
        if (job.attemptsMade + 1 >= attempts)
          await this.repository.setRun(job.data.workspaceId, job.data.runId, {
            $set: { status: 'dead_letter', failureReason: `Node ${node.id} failed` },
            $inc: { activeJobs: -1 },
          });
        throw error;
      }
    } finally {
      await release();
    }
  }
  private next(graph: WorkflowGraph, nodeId: string, branch?: string) {
    const edges = graph.edges.filter((edge) => edge.source === nodeId);
    return branch
      ? edges.filter((edge) => edge.branch === branch)
      : edges.filter((edge) => !edge.branch || edges.length === 1);
  }
}
