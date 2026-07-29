import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { AgentMemoryPolicyService } from './agent-memory-policy.service.js';
import { AgentExecutionPolicy } from './policies/agent-execution.policy.js';
import { AgentToolExecutor } from './tools/agent-tool-executor.service.js';
import { AgentToolRegistry } from './tools/agent-tool.registry.js';

const context = (workspaceId = 'tenant-a') => ({
  workspaceId,
  userId: 'user',
  agentId: 'agent',
  runId: 'run',
  correlationId: 'correlation',
  permissions: ['contacts.read'] as never[],
  signal: new AbortController().signal,
});

describe('agent execution controls', () => {
  it('rejects unauthorized tools and unknown tools', async () => {
    const registry = new AgentToolRegistry();
    const executor = new AgentToolExecutor(registry, {} as never);
    await expect(executor.execute({ toolName: 'database_query', arguments: {}, idempotencyKey: '1', permittedTools: [] }, context())).rejects.toThrow('not permitted');
  });

  it('preserves workspace isolation at the tool boundary', async () => {
    const registry = new AgentToolRegistry();
    const invoke = vi.fn().mockResolvedValue({ ok: true });
    registry.register({ name: 'read_contact', description: '', schema: z.object({ contactId: z.string() }), permission: 'contacts.read', sensitive: false, timeoutMs: 100, execute: async (value, ctx) => { await invoke(ctx.workspaceId, value); return { ok: true }; } });
    const runs = { reserveTool: vi.fn().mockResolvedValue({ execution: { _id: 'execution' }, duplicate: false }), completeTool: vi.fn(), failTool: vi.fn() };
    await new AgentToolExecutor(registry, runs as never).execute({ toolName: 'read_contact', arguments: { contactId: 'contact', workspaceId: 'tenant-b' }, idempotencyKey: '1', permittedTools: ['read_contact'] }, context());
    expect(invoke).toHaveBeenCalledWith('tenant-a', { contactId: 'contact' });
  });

  it('requires durable human approval before a sensitive tool executes', async () => {
    const registry = new AgentToolRegistry();
    const invoke = vi.fn();
    registry.register({ name: 'create_task', description: '', schema: z.object({ title: z.string() }), permission: 'contacts.read', sensitive: true, timeoutMs: 100, execute: () => { invoke(); return Promise.resolve({ ok: true }); } });
    const execution = { _id: 'execution', status: 'pending_approval' };
    const runs = { reserveTool: vi.fn().mockResolvedValue({ execution, duplicate: false }), approveTool: vi.fn(), completeTool: vi.fn(), failTool: vi.fn() };
    await expect(new AgentToolExecutor(registry, runs as never).execute({ toolName: 'create_task', arguments: { title: 'Follow up' }, idempotencyKey: '1', permittedTools: ['create_task'] }, context())).resolves.toEqual(execution);
    expect(invoke).not.toHaveBeenCalled();
  });

  it.each([
    [{ iteration: 2, toolCallCount: 0, costUsd: 0, deadline: new Date(Date.now() + 1000) }, 'loop'],
    [{ iteration: 0, toolCallCount: 2, costUsd: 0, deadline: new Date(Date.now() + 1000) }, 'tool-call'],
    [{ iteration: 0, toolCallCount: 0, costUsd: 1, deadline: new Date(Date.now() + 1000) }, 'budget'],
  ])('enforces loop, tool and cost budgets', (run, reason) => {
    expect(() => new AgentExecutionPolicy().assertBudget(run, { maxIterations: 2, maxToolCalls: 2, maxCostUsd: 1 })).toThrow(reason);
  });

  it('gates long-term memory on consent and retention limits', async () => {
    const denied = new AgentMemoryPolicyService({ evaluate: vi.fn().mockResolvedValue({ allowed: false, reason: 'withdrawn' }) } as never);
    await expect(denied.authorize({ workspaceId: 'w', subjectId: 's', longTermEnabled: true, ttlDays: 30 })).rejects.toThrow('withdrawn');
    const allowed = new AgentMemoryPolicyService({ evaluate: vi.fn().mockResolvedValue({ allowed: true, policyVersionId: 'policy' }) } as never);
    await expect(allowed.authorize({ workspaceId: 'w', subjectId: 's', longTermEnabled: true, ttlDays: 366 })).rejects.toThrow('retention');
  });
});
