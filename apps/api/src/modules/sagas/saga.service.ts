import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { sagaDefinition } from './saga-definitions.js';
import { SagaRepository } from './repositories/saga.repository.js';
import type { Saga } from './schemas/saga.schema.js';
import { SagaStepExecutor } from './saga-step-executor.service.js';
import type { SagaJob, SagaStepDefinition, SagaType } from './saga.types.js';

export const SAGA_QUEUE = 'saga-orchestration';
export const SAGA_MONITOR_QUEUE = 'saga-monitor';

@Injectable()
export class SagaService {
  constructor(
    private readonly repository: SagaRepository,
    private readonly executor: SagaStepExecutor,
    @InjectQueue(SAGA_QUEUE) private readonly queue: Queue<SagaJob>,
  ) {}

  async start(input: {
    workspaceId: string;
    type: SagaType;
    correlationId: string;
    payload?: Record<string, unknown>;
  }) {
    const definition = sagaDefinition(input.type);
    if (!definition) throw new BadRequestException('Unknown saga type');
    const result = await this.repository.create({
      ...input,
      payload: input.payload ?? {},
      timeoutAt: new Date(Date.now() + definition.timeoutMs),
      currentStep: definition.steps[0]?.name ?? '',
    });
    if (!result.duplicate) await this.enqueue(result.saga);
    return result;
  }

  async advance(workspaceId: string, sagaId: string): Promise<Saga> {
    let saga = await this.require(workspaceId, sagaId);
    if (['completed', 'cancelled', 'manual_intervention'].includes(saga.status))
      return saga;
    const definition = sagaDefinition(saga.type);
    if (!definition) return this.manual(saga, 'Saga definition is unavailable');
    if (saga.timeoutAt.valueOf() <= Date.now()) return this.beginRecovery(saga, 'Saga timed out');
    if (saga.cancellationRequested) return this.beginRecovery(saga, 'Cancellation requested');
    if (
      saga.status === 'waiting_retry' &&
      saga.nextAttemptAt &&
      saga.nextAttemptAt.valueOf() > Date.now()
    )
      return saga;
    if (saga.status === 'waiting_external') {
      if (saga.stepDeadlineAt && saga.stepDeadlineAt.valueOf() <= Date.now())
        return this.beginRecovery(saga, `Step ${saga.currentStep ?? 'unknown'} timed out`);
      return saga;
    }
    if (saga.status === 'compensating') return this.compensate(saga, definition.steps);

    const step = definition.steps.find((candidate) => candidate.name === saga.currentStep);
    if (!step) return this.complete(saga);
    const attempts = (saga.stepAttempts[step.name] ?? 0) + 1;
    saga = await this.repository.transition(
      saga,
      {
        $set: { status: 'running', lastError: null },
        $inc: { [`stepAttempts.${step.name}`]: 1 },
      },
      { action: 'step_started', step: step.name, attempt: attempts, actor: 'worker' },
    );
    try {
      const result = await this.executor.execute(saga, step, false);
      if (result.outcome === 'waiting')
        return this.waitForExternal(saga, step, result.externalReference);
      return this.stepSucceeded(saga, step, definition.steps);
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 1000) : 'Step failed';
      if (attempts >= step.maxAttempts) return this.beginRecovery(saga, message);
      const delay = Math.min(60_000, 1000 * 2 ** (attempts - 1));
      const waiting = await this.repository.transition(
        saga,
        {
          $set: {
            status: 'waiting_retry',
            lastError: message,
            nextAttemptAt: new Date(Date.now() + delay),
          },
        },
        {
          action: 'step_failed',
          step: step.name,
          attempt: attempts,
          error: message,
          actor: 'worker',
        },
      );
      await this.enqueue(waiting, delay);
      return waiting;
    }
  }

  async signal(input: {
    workspaceId: string;
    sagaId: string;
    step: string;
    success: boolean;
    externalReference?: string;
    error?: string;
  }) {
    const saga = await this.require(input.workspaceId, input.sagaId);
    if (saga.status !== 'waiting_external' || saga.currentStep !== input.step)
      throw new ConflictException('Saga is not waiting for this step');
    const definition = sagaDefinition(saga.type);
    const step = definition?.steps.find((candidate) => candidate.name === input.step);
    if (!definition || !step) return this.manual(saga, 'Signalled step is undefined');
    if (saga.awaitingCompensation) {
      if (!input.success) {
        const attemptKey = `compensate.${step.name}`;
        const attempts = saga.stepAttempts[attemptKey] ?? 1;
        if (attempts >= step.maxAttempts)
          return this.manual(saga, input.error ?? `Compensation failed for ${step.name}`);
        const waiting = await this.repository.transition(
          saga,
          {
            $set: {
              status: 'compensating',
              awaitingCompensation: false,
              lastError: input.error ?? `Compensation failed for ${step.name}`,
              nextAttemptAt: new Date(),
              stepDeadlineAt: null,
            },
          },
          {
            action: 'compensation_failed',
            step: step.name,
            attempt: attempts,
            error: input.error,
            actor: 'external',
          },
        );
        await this.enqueue(waiting);
        return waiting;
      }
      const compensated = await this.repository.transition(
        saga,
        {
          $addToSet: { compensationSteps: step.name },
          $set: {
            status: 'compensating',
            awaitingCompensation: false,
            externalReference: input.externalReference ?? null,
            stepDeadlineAt: null,
          },
        },
        { action: 'step_compensated', step: step.name, actor: 'external' },
      );
      await this.enqueue(compensated);
      return compensated;
    }
    if (!input.success) {
      const attempts = saga.stepAttempts[step.name] ?? 1;
      if (attempts >= step.maxAttempts)
        return this.beginRecovery(saga, input.error ?? 'Step failed');
      const waiting = await this.repository.transition(
        saga,
        {
          $set: {
            status: 'waiting_retry',
            lastError: input.error ?? 'External step failed',
            nextAttemptAt: new Date(),
            externalReference: input.externalReference ?? null,
            stepDeadlineAt: null,
          },
        },
        { action: 'step_rejected', step: step.name, actor: 'external' },
      );
      await this.enqueue(waiting);
      return waiting;
    }
    const progressed = await this.stepSucceeded(saga, step, definition.steps);
    if (!['completed', 'manual_intervention'].includes(progressed.status))
      await this.enqueue(progressed);
    return progressed;
  }

  async cancel(workspaceId: string, sagaId: string, actorId: string) {
    const saga = await this.require(workspaceId, sagaId);
    if (['completed', 'cancelled'].includes(saga.status))
      throw new ConflictException('Saga is already terminal');
    const value = await this.repository.transition(
      saga,
      { $set: { cancellationRequested: true, status: 'pending' } },
      { action: 'cancellation_requested', actor: actorId },
    );
    await this.enqueue(value);
    return value;
  }

  async operatorRetry(workspaceId: string, sagaId: string, actorId: string) {
    const saga = await this.require(workspaceId, sagaId);
    if (!['waiting_retry', 'manual_intervention'].includes(saga.status))
      throw new ConflictException('Saga is not retryable');
    const value = await this.repository.transition(
      saga,
      {
        $set: {
          status: saga.compensationSteps.length ? 'compensating' : 'pending',
          manualInterventionReason: null,
          nextAttemptAt: new Date(),
          lastError: null,
        },
      },
      { action: 'operator_retry', actor: actorId },
    );
    await this.enqueue(value);
    return value;
  }

  async operatorResume(workspaceId: string, sagaId: string, actorId: string, step?: string) {
    const saga = await this.require(workspaceId, sagaId);
    if (saga.status !== 'manual_intervention')
      throw new ConflictException('Saga does not require intervention');
    const definition = sagaDefinition(saga.type);
    if (!definition || (step && !definition.steps.some((candidate) => candidate.name === step)))
      throw new BadRequestException('Invalid resume step');
    const value = await this.repository.transition(
      saga,
      {
        $set: {
          status: saga.cancellationRequested ? 'compensating' : 'pending',
          currentStep: step ?? saga.currentStep,
          manualInterventionReason: null,
          lastError: null,
        },
      },
      { action: 'operator_resume', step: step ?? saga.currentStep, actor: actorId },
    );
    await this.enqueue(value);
    return value;
  }

  get(workspaceId: string, sagaId: string) {
    return this.require(workspaceId, sagaId);
  }
  metrics(workspaceId?: string) {
    return this.repository.metrics(workspaceId);
  }

  private async stepSucceeded(
    saga: Saga,
    step: SagaStepDefinition,
    steps: readonly SagaStepDefinition[],
  ) {
    const index = steps.findIndex((candidate) => candidate.name === step.name);
    const next = steps[index + 1];
    return this.repository.transition(
      saga,
      {
        $set: {
          status: next ? 'pending' : 'completed',
          currentStep: next?.name ?? null,
          completedAt: next ? null : new Date(),
          externalReference: null,
          awaitingCompensation: false,
          nextAttemptAt: null,
          stepDeadlineAt: null,
        },
        $addToSet: { completedSteps: step.name },
      },
      { action: 'step_completed', step: step.name, actor: 'worker' },
    );
  }

  private async beginRecovery(saga: Saga, reason: string) {
    const definition = sagaDefinition(saga.type);
    const reversible = [...saga.completedSteps]
      .reverse()
      .find((name) => definition?.steps.find((step) => step.name === name)?.compensation);
    if (!reversible) {
      if (saga.cancellationRequested && !saga.completedSteps.length)
        return this.repository.transition(
          saga,
          { $set: { status: 'cancelled', completedAt: new Date(), lastError: reason } },
          { action: 'cancelled', reason, actor: 'worker' },
        );
      return this.manual(saga, `${reason}; no technically valid compensation remains`);
    }
    return this.repository.transition(
      saga,
      { $set: { status: 'compensating', currentStep: reversible, lastError: reason } },
      { action: 'compensation_started', step: reversible, reason, actor: 'worker' },
    );
  }

  private async compensate(saga: Saga, steps: readonly SagaStepDefinition[]) {
    const pending = [...saga.completedSteps]
      .reverse()
      .find(
        (name) =>
          !saga.compensationSteps.includes(name) &&
          steps.find((s) => s.name === name)?.compensation,
      );
    if (!pending)
      return this.repository.transition(
        saga,
        {
          $set: {
            status: saga.cancellationRequested ? 'cancelled' : 'manual_intervention',
            completedAt: saga.cancellationRequested ? new Date() : null,
            manualInterventionReason: saga.cancellationRequested
              ? null
              : 'Compensation completed; original operation remains failed',
          },
        },
        { action: 'compensation_finished', actor: 'worker' },
      );
    const step = steps.find((candidate) => candidate.name === pending);
    if (!step?.compensation) return this.manual(saga, 'Compensation definition is unavailable');
    try {
      const attemptKey = `compensate.${step.name}`;
      const attempts = (saga.stepAttempts[attemptKey] ?? 0) + 1;
      saga = await this.repository.transition(
        saga,
        { $inc: { [`stepAttempts.${attemptKey}`]: 1 } },
        { action: 'compensation_started', step: step.name, attempt: attempts, actor: 'worker' },
      );
      const result = await this.executor.execute(saga, step, true);
      if (result.outcome === 'waiting')
        return this.waitForExternal(saga, step, result.externalReference, true);
      return this.repository.transition(
        saga,
        { $addToSet: { compensationSteps: step.name }, $set: { status: 'compensating' } },
        { action: 'step_compensated', step: step.name, actor: 'worker' },
      );
    } catch (error) {
      return this.manual(
        saga,
        `Compensation failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }

  private complete(saga: Saga) {
    return this.repository.transition(
      saga,
      { $set: { status: 'completed', currentStep: null, completedAt: new Date() } },
      { action: 'completed', actor: 'worker' },
    );
  }

  private async manual(saga: Saga, reason: string) {
    const value = await this.repository.transition(
      saga,
      {
        $set: {
          status: 'manual_intervention',
          manualInterventionReason: reason,
          lastError: reason,
        },
      },
      { action: 'manual_intervention_required', reason, actor: 'worker' },
    );
    await this.repository.alert(value, 'manual_intervention', reason);
    return value;
  }

  private async waitForExternal(
    saga: Saga,
    step: SagaStepDefinition,
    externalReference?: string,
    compensation = false,
  ) {
    const deadline = new Date(Math.min(saga.timeoutAt.valueOf(), Date.now() + step.timeoutMs));
    const waiting = await this.repository.transition(
      saga,
      {
        $set: {
          currentStep: step.name,
          status: 'waiting_external',
          externalReference: externalReference ?? null,
          awaitingCompensation: compensation,
          stepDeadlineAt: deadline,
        },
      },
      {
        action: compensation ? 'compensation_dispatched' : 'step_dispatched',
        step: step.name,
        actor: 'worker',
      },
    );
    await this.enqueue(waiting, Math.max(0, deadline.valueOf() - Date.now()));
    return waiting;
  }

  private async require(workspaceId: string, sagaId: string) {
    const saga = await this.repository.get(workspaceId, sagaId);
    if (!saga) throw new NotFoundException('Saga not found');
    return saga;
  }

  private enqueue(saga: Saga, delay = 0) {
    return this.queue.add(
      'saga.advance',
      { sagaId: String(saga._id), workspaceId: String(saga.workspaceId) },
      {
        jobId: `saga-${String(saga._id)}-v${saga.version}`,
        delay,
        attempts: 1,
        removeOnComplete: 1000,
        removeOnFail: false,
      },
    );
  }
}
