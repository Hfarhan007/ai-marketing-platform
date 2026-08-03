import { Inject, Injectable } from '@nestjs/common';
import { ClassifiedAgentError, classifyAgentError, type AgentRunState, type RuntimeEvents, type RuntimeRun, type RuntimeStore } from './agent-runtime.types.js';

export const AGENT_RUNTIME_STORE = Symbol('AGENT_RUNTIME_STORE');
export const AGENT_RUNTIME_EVENTS = Symbol('AGENT_RUNTIME_EVENTS');
const ACTIVE: AgentRunState[] = ['queued', 'planning', 'retrieving', 'awaiting_tool', 'executing_tool', 'responding'];

@Injectable()
export class AgentRuntimeService {
  constructor(@Inject(AGENT_RUNTIME_STORE) private readonly store: RuntimeStore, @Inject(AGENT_RUNTIME_EVENTS) private readonly events: RuntimeEvents) {}

  async executeStep<T>(runId: string, key: string, kind: string, state: AgentRunState, operation: (run: RuntimeRun) => Promise<T>, input?: unknown): Promise<T> {
    await this.guard(runId);
    const reservation = await this.store.beginStep(runId, key, kind, input);
    if (reservation.duplicate && reservation.step.status === 'completed') return reservation.step.output as T;
    const run = await this.store.transition(runId, ACTIVE, state);
    await this.events.publish(runId, { type: 'run.state_changed', state });
    try {
      const output = await operation(run);
      await this.store.completeStep(runId, key, output);
      await this.store.heartbeat(runId);
      await this.events.publish(runId, { type: 'run.step_completed', state, data: { key, kind } });
      return output;
    } catch (error) {
      const classified = classifyAgentError(error);
      await this.store.failStep(runId, key, classified);
      await this.store.recordError(runId, `${key}:${classified.code}`, classified);
      if (classified.classification === 'non_retryable') await this.fail(runId, classified);
      throw classified;
    }
  }

  async pauseForApproval(runId: string, stepKey: string) {
    await this.guard(runId);
    const run = await this.store.transition(runId, ACTIVE, 'awaiting_approval', `approval:${stepKey}`);
    await this.events.publish(runId, { type: 'run.approval_required', state: run.state, data: { stepKey } });
    return run;
  }

  async resume(runId: string) {
    const run = await this.guard(runId);
    if (run.state === 'awaiting_approval') throw new ClassifiedAgentError('Run still requires approval', 'APPROVAL_REQUIRED', 'non_retryable');
    await this.events.publish(runId, { type: 'run.resumed', state: run.state });
    return run;
  }

  async cancel(runId: string) {
    await this.store.requestCancellation(runId);
    const run = await this.store.transition(runId, [...ACTIVE, 'awaiting_approval'], 'cancelled', 'cancelled_by_user');
    await this.events.publish(runId, { type: 'run.cancelled', state: 'cancelled' });
    return run;
  }

  async complete(runId: string) {
    const run = await this.store.transition(runId, ACTIVE, 'completed', 'completed');
    await this.events.publish(runId, { type: 'run.completed', state: 'completed' });
    return run;
  }

  private async guard(runId: string) {
    const run = await this.store.getRun(runId);
    if (run.cancellationRequested || run.state === 'cancelled') throw new ClassifiedAgentError('Run cancelled', 'RUN_CANCELLED', 'non_retryable');
    if (Date.now() >= run.limits.deadline.valueOf()) {
      await this.store.transition(runId, ACTIVE, 'timed_out', 'wall_clock_deadline');
      throw new ClassifiedAgentError('Run deadline exceeded', 'RUN_TIMED_OUT', 'non_retryable');
    }
    if (run.stepCount >= run.limits.maxSteps) throw await this.limit(runId, 'MAX_STEPS');
    if (run.toolCallCount >= run.limits.maxToolCalls) throw await this.limit(runId, 'MAX_TOOL_CALLS');
    if (run.inputTokens + run.outputTokens >= run.limits.maxTokens) throw await this.limit(runId, 'TOKEN_BUDGET');
    if (run.costUsd >= run.limits.maxCostUsd) throw await this.limit(runId, 'COST_BUDGET');
    return run;
  }

  private async limit(runId: string, code: string) {
    const error = new ClassifiedAgentError(`Agent run limit exceeded: ${code}`, code, 'non_retryable');
    await this.fail(runId, error);
    return error;
  }

  private async fail(runId: string, error: ClassifiedAgentError) {
    await this.store.transition(runId, ACTIVE, 'failed', error.code);
    await this.events.publish(runId, { type: 'run.failed', state: 'failed', data: { code: error.code, classification: error.classification } });
  }
}
