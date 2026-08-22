import { InjectQueue } from '@nestjs/bullmq';
import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { createHash, randomUUID } from 'node:crypto';
import type { Redis } from 'ioredis';
import { Types } from 'mongoose';
import { REDIS_CLIENT } from '../../../cache/redis.constants.js';
import type { WorkspaceRequestContext } from '../../../common/types/workspace-context.js';
import { TransactionManagerService } from '../../../database/transactions/transaction-manager.service.js';
import { OutboxService } from '../../../events/outbox.service.js';
import { CrmEventService } from '../../crm/crm-event.service.js';
import type { CreateWorkflowDto, TriggerWorkflowDto, UpdateDraftDto } from '../dto/workflow.dto.js';
import { WorkflowRepository } from '../repositories/workflow.repository.js';
import type { WorkflowGraph, WorkflowJob } from '../types/workflow.types.js';
import { WorkflowGraphValidator } from './workflow-graph-validator.service.js';
export const WORKFLOW_QUEUE = 'workflow-execution';
export const isWorkflowId = (value: string): boolean => Types.ObjectId.isValid(value);
@Injectable()
export class WorkflowService {
  constructor(
    private readonly repository: WorkflowRepository,
    private readonly validator: WorkflowGraphValidator,
    private readonly transactions: TransactionManagerService,
    @InjectQueue(WORKFLOW_QUEUE) private readonly queue: Queue,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly events: CrmEventService,
    private readonly outbox: OutboxService,
  ) {}
  create(c: WorkspaceRequestContext, d: CreateWorkflowDto) {
    this.validator.validate(d.graph);
    return this.repository.create(c.workspaceId, c.userId, d.name, d.description, d.graph);
  }
  updateDraft(c: WorkspaceRequestContext, id: string, d: UpdateDraftDto) {
    this.validator.validate(d.graph);
    return this.repository.updateDraft(c.workspaceId, id, d.graph);
  }
  async publish(c: WorkspaceRequestContext, id: string) {
    const value = await this.transactions.run(async (session) => {
      const draft = await this.repository.draft(c.workspaceId, id, session);
      this.validator.validate(draft.graph as unknown as WorkflowGraph);
      const checksum = createHash('sha256').update(JSON.stringify(draft.graph)).digest('hex');
      return this.repository.publish(c.workspaceId, id, c.userId, checksum, session);
    });
    await this.events.record({
      workspaceId: c.workspaceId,
      actorId: c.userId,
      entityType: 'workflow',
      entityId: id,
      action: 'published',
    });
    return value;
  }
  async trigger(
    workspaceId: string,
    definitionId: string,
    triggerType: string,
    d: TriggerWorkflowDto,
  ) {
    const version = await this.repository.published(workspaceId, definitionId);
    const result = await this.transactions.run(async (session) => {
      const reserved = await this.repository.reserveRun(
        {
          workspaceId,
          definitionId,
          versionId: String(version._id),
          correlationId: d.correlationId ?? randomUUID(),
          idempotencyKey: d.idempotencyKey,
          triggerType,
          payload: d.input,
        },
        session,
      );
      if (!reserved.duplicate) {
        await this.outbox.append(
          {
            eventId: `workflow-trigger:${d.idempotencyKey}`,
            eventType: 'workflow.triggered',
            aggregateType: 'workflowRun',
            aggregateId: String(reserved.run._id),
            workspaceId,
            payload: { definitionId, runId: String(reserved.run._id), triggerType },
            correlationId: reserved.run.correlationId,
            causationId: d.idempotencyKey,
          },
          session,
        );
      }
      return reserved;
    });
    if (result.duplicate) return { runId: String(result.run._id), duplicate: true };
    const graph = version.graph as unknown as WorkflowGraph;
    const trigger =
      graph.nodes.find((node) => node.type === triggerType) ||
      graph.nodes.find((node) => node.type.startsWith('trigger.'));
    if (!trigger) throw new ConflictException('Published workflow does not support this trigger');
    await this.enqueue(
      {
        workspaceId,
        runId: String(result.run._id),
        nodeId: trigger.id,
        correlationId: result.run.correlationId,
        attempt: 1,
      },
      0,
      trigger.retry,
    );
    return { runId: String(result.run._id), duplicate: false };
  }
  async triggerEvent(
    workspaceId: string,
    triggerType: string,
    eventId: string,
    input: Record<string, unknown>,
    correlationId?: string,
  ) {
    const versions = await this.repository.publishedForTrigger(workspaceId, triggerType);
    return Promise.all(
      versions.map((version) => {
        const definitionId = String(version.workflowDefinitionId);
        return this.trigger(workspaceId, definitionId, triggerType, {
          idempotencyKey: `${eventId}:${definitionId}`,
          ...(correlationId ? { correlationId } : {}),
          input,
        });
      }),
    );
  }
  manual(c: WorkspaceRequestContext, id: string, d: TriggerWorkflowDto) {
    return this.trigger(c.workspaceId, id, 'trigger.manual', d);
  }
  async command(c: WorkspaceRequestContext, runId: string, command: 'cancel' | 'pause' | 'resume') {
    const status = command === 'cancel' ? 'cancelled' : command === 'pause' ? 'paused' : 'running';
    const run = await this.repository.setRun(c.workspaceId, runId, { $set: { status } });
    if (!run) throw new NotFoundException('Active workflow run not found');
    if (command === 'resume') {
      const history = await this.repository.history(c.workspaceId, runId);
      const nodeId = history.at(-1)?.nodeId;
      if (nodeId)
        await this.enqueue({
          workspaceId: c.workspaceId,
          runId,
          nodeId,
          correlationId: run.correlationId,
          attempt: 1,
        });
    }
    return run;
  }
  async recover(c: WorkspaceRequestContext, runId: string, nodeId: string) {
    const run = await this.repository.setRun(c.workspaceId, runId, {
      $set: { status: 'running', failureReason: null },
    });
    if (!run) throw new NotFoundException('Recoverable run not found');
    await this.enqueue({
      workspaceId: c.workspaceId,
      runId,
      nodeId,
      correlationId: run.correlationId,
      attempt: 1,
    });
    return { requeued: true };
  }
  async acquire(workspaceId: string) {
    const key = `workflow:concurrency:${workspaceId}`,
      value = await this.redis.incr(key);
    if (value === 1) await this.redis.expire(key, 3600);
    if (value > 25) {
      await this.redis.decr(key);
      throw new ConflictException('Workspace workflow concurrency limit reached');
    }
    return async () => {
      await this.redis.decr(key);
    };
  }
  enqueue(job: WorkflowJob, delay = 0, retry?: { attempts: number; backoffMs: number }) {
    return this.queue.add('workflow.step', job, {
      jobId: `${job.runId}-${job.nodeId}-${job.attempt}-${Date.now()}`,
      delay,
      attempts: retry?.attempts ?? 3,
      priority: 5,
      backoff: { type: 'exponential', delay: retry?.backoffMs ?? 1000 },
    });
  }
  history(c: WorkspaceRequestContext, runId: string) {
    return this.repository.history(c.workspaceId, runId);
  }
}
