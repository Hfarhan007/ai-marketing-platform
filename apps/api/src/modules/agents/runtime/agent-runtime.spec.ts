import { describe, expect, it, vi } from 'vitest';
import { AgentRuntimeService } from './agent-runtime.service.js';
import { ClassifiedAgentError, type AgentRunState, type RuntimeEvents, type RuntimeRun, type RuntimeStep, type RuntimeStore } from './agent-runtime.types.js';
import { RecordedModelReplay } from './recorded-model-replay.js';

class MemoryStore implements RuntimeStore {
  run: RuntimeRun = { id: 'run-1', workspaceId: 'workspace-1', state: 'queued', stepCount: 0, toolCallCount: 0, inputTokens: 0, outputTokens: 0, costUsd: 0, cancellationRequested: false, limits: { maxSteps: 10, maxToolCalls: 5, maxTokens: 1000, maxCostUsd: 1, deadline: new Date(Date.now() + 60_000) } };
  readonly steps = new Map<string, RuntimeStep>();
  readonly errors: ClassifiedAgentError[] = [];
  getRun() { return Promise.resolve(structuredClone(this.run)); }
  transition(_id: string, from: AgentRunState[], to: AgentRunState) { if (from.includes(this.run.state)) this.run.state = to; return this.getRun(); }
  heartbeat() { return Promise.resolve(); }
  beginStep(_id: string, key: string, kind: string) { const existing = this.steps.get(key); if (existing) return Promise.resolve({ step: structuredClone(existing), duplicate: true }); const step: RuntimeStep = { key, kind, status: 'started' }; this.steps.set(key, step); this.run.stepCount += 1; return Promise.resolve({ step, duplicate: false }); }
  completeStep(_id: string, key: string, output?: unknown) { this.steps.set(key, { ...this.steps.get(key)!, status: 'completed', output }); return Promise.resolve(); }
  failStep(_id: string, key: string) { this.steps.set(key, { ...this.steps.get(key)!, status: 'failed' }); return Promise.resolve(); }
  recordError(_id: string, _key: string, error: ClassifiedAgentError) { this.errors.push(error); return Promise.resolve(); }
  requestCancellation() { this.run.cancellationRequested = true; return Promise.resolve(); }
}

const events = (): RuntimeEvents & { values: unknown[] } => ({ values: [], publish(_runId, event) { this.values.push(event); } });

describe('durable agent runtime crash recovery', () => {
  it('returns a persisted step response after a worker crash without calling the model twice', async () => {
    const store = new MemoryStore(), model = new RecordedModelReplay([{ runId: 'run-1', stepKey: 'model:1', response: { content: 'stable', tokens: 7 } }]);
    const firstWorker = new AgentRuntimeService(store, events()), call = vi.fn(() => model.complete('run-1', 'model:1'));
    expect(await firstWorker.executeStep('run-1', 'model:1', 'model_call', 'planning', call)).toEqual({ content: 'stable', tokens: 7 });
    // New service instance simulates a process restart; the store survives it.
    const recoveredWorker = new AgentRuntimeService(store, events());
    expect(await recoveredWorker.executeStep('run-1', 'model:1', 'model_call', 'planning', call)).toEqual({ content: 'stable', tokens: 7 });
    expect(call).toHaveBeenCalledTimes(1);
  });

  it('classifies transient failures for BullMQ retry and resumes the same idempotent step', async () => {
    const store = new MemoryStore(), runtime = new AgentRuntimeService(store, events());
    const transient = Object.assign(new Error('reset'), { code: 'ECONNRESET' });
    await expect(runtime.executeStep('run-1', 'retrieve:1', 'retrieval', 'retrieving', () => Promise.reject(transient))).rejects.toMatchObject({ classification: 'retryable' });
    expect(store.run.state).toBe('retrieving');
    await expect(runtime.executeStep('run-1', 'retrieve:1', 'retrieval', 'retrieving', () => Promise.resolve(['source']))).resolves.toEqual(['source']);
  });

  it('enforces budgets, deadline, and cancellation before another effect starts', async () => {
    const store = new MemoryStore(), runtime = new AgentRuntimeService(store, events()), effect = vi.fn<() => Promise<void>>(() => Promise.resolve());
    store.run.stepCount = store.run.limits.maxSteps;
    await expect(runtime.executeStep('run-1', 'blocked', 'tool', 'executing_tool', () => effect())).rejects.toMatchObject({ code: 'MAX_STEPS' });
    expect(effect).not.toHaveBeenCalled();
    store.run.state = 'queued'; store.run.stepCount = 0;
    await runtime.cancel('run-1');
    await expect(runtime.executeStep('run-1', 'cancelled', 'tool', 'executing_tool', () => effect())).rejects.toMatchObject({ code: 'RUN_CANCELLED' });
    expect(effect).not.toHaveBeenCalled();
  });

  it('replays stored mock model responses deterministically', async () => {
    const records = [{ runId: 'run-1', stepKey: 'answer', response: { content: 'same bytes', usage: { input: 2, output: 3 } } }];
    expect(await new RecordedModelReplay(records).complete('run-1', 'answer')).toEqual(await new RecordedModelReplay(records).complete('run-1', 'answer'));
  });
});
