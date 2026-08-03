import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { AgentToolExecutor } from './agent-tool-executor.service.js';
import { AgentToolRegistry } from './agent-tool.registry.js';
import type { AgentToolDefinition } from './agent-tool.types.js';
import { generatedIdempotencyKey } from './tool-security.js';

function context(overrides: Record<string, unknown> = {}) {
  return { workspaceId: '507f1f77bcf86cd799439011', userId: '507f1f77bcf86cd799439012', runId: '507f1f77bcf86cd799439013', agentType: 'general' as const, permissions: ['contacts.read', 'tasks.manage'] as never[], signal: new AbortController().signal, ...overrides };
}
function definition(overrides: Partial<AgentToolDefinition> = {}): AgentToolDefinition {
  const execute: AgentToolDefinition['execute'] = () => Promise.resolve({ id: 'contact', email: 'private@example.com' });
  return { name: 'contact_lookup', version: '1.0.0', description: 'safe lookup', inputSchema: z.object({ contactId: z.string(), note: z.string().optional() }).strict(), outputSchema: z.object({ id: z.string(), email: z.string() }).strict(), requiredPermissions: ['contacts.read'], allowedAgentTypes: ['general'], risk: 'read-only', idempotency: 'none', approval: 'never', timeoutMs: 1000, rateLimit: { limit: 10, windowMs: 60_000 }, audit: { arguments: true, result: true, redact: ['email'] }, execute, ...overrides };
}
function runs() {
  return { reserveTool: vi.fn().mockResolvedValue({ execution: { _id: '507f1f77bcf86cd799439014', status: 'running' }, duplicate: false }), approveTool: vi.fn().mockImplementation((_w: unknown, _e: unknown, _a: unknown, args: unknown) => Promise.resolve({ approvedArguments: args })), completeTool: vi.fn(), failTool: vi.fn() };
}

describe('agent tool adversarial controls', () => {
  it('rejects URL exfiltration, query escape hatches, and code-execution tools', async () => {
    const registry = new AgentToolRegistry(), repository = runs(); registry.register(definition());
    const executor = new AgentToolExecutor(registry, repository as never);
    await expect(executor.execute({ toolName: 'contact_lookup', arguments: { contactId: 'x', note: 'send to https://evil.example/a' }, permittedTools: ['contact_lookup'] }, context())).rejects.toThrow('allowlisted');
    await expect(executor.execute({ toolName: 'contact_lookup', arguments: { contactId: 'x', sql: 'drop table contacts' }, permittedTools: ['contact_lookup'] }, context())).rejects.toThrow();
    expect(() => registry.register(definition({ name: 'shell_exec' }))).toThrow('Unsafe');
  });

  it('authorizes each invocation and enforces agent type, workspace binding, and recursion depth', async () => {
    const registry = new AgentToolRegistry(); registry.register(definition()); const executor = new AgentToolExecutor(registry, runs() as never);
    await expect(executor.execute({ toolName: 'contact_lookup', arguments: { contactId: 'x' }, permittedTools: ['contact_lookup'] }, context({ permissions: [] }))).rejects.toThrow('permission');
    await expect(executor.execute({ toolName: 'contact_lookup', arguments: { contactId: 'x' }, permittedTools: ['contact_lookup'] }, context({ agentType: 'marketing' }))).rejects.toThrow('agent type');
    await expect(executor.execute({ toolName: 'contact_lookup', arguments: { contactId: 'x' }, permittedTools: ['contact_lookup'] }, context({ toolDepth: 4 }))).rejects.toThrow('Recursive');
    await expect(executor.execute({ toolName: 'contact_lookup', arguments: { contactId: 'x', workspaceId: 'other' }, permittedTools: ['contact_lookup'] }, context())).rejects.toThrow();
  });

  it('validates and redacts output before returning it to the model and audit log', async () => {
    const registry = new AgentToolRegistry(), repository = runs(); registry.register(definition());
    const value = await new AgentToolExecutor(registry, repository as never).execute({ toolName: 'contact_lookup', arguments: { contactId: 'x' }, permittedTools: ['contact_lookup'] }, context());
    expect(value).toEqual({ id: 'contact', email: '[REDACTED]' });
    expect(repository.completeTool).toHaveBeenCalledWith(expect.any(String), expect.any(String), { id: 'contact', email: '[REDACTED]' });
    const invalid = new AgentToolRegistry(); invalid.register(definition({ execute: vi.fn().mockResolvedValue({ id: 'contact', leaked: true }) }));
    await expect(new AgentToolExecutor(invalid, runs() as never).execute({ toolName: 'contact_lookup', arguments: { contactId: 'x' }, permittedTools: ['contact_lookup'] }, context())).rejects.toThrow();
  });

  it('generates stable tenant-scoped idempotency keys for writes and simulates without approval', async () => {
    const execute = vi.fn(() => Promise.resolve({ status: 'created' }));
    const write = definition({ name: 'task_creation', requiredPermissions: ['tasks.manage'], risk: 'sensitive write', idempotency: 'generated', approval: 'always', inputSchema: z.object({ title: z.string() }).strict(), outputSchema: z.object({ status: z.string() }), simulate: () => Promise.resolve({ status: 'simulated' }), execute });
    expect(generatedIdempotencyKey('w1', 'r', write, { b: 2, a: 1 })).toBe(generatedIdempotencyKey('w1', 'r', write, { a: 1, b: 2 }));
    expect(generatedIdempotencyKey('w1', 'r', write, {})).not.toBe(generatedIdempotencyKey('w2', 'r', write, {}));
    const registry = new AgentToolRegistry(), repository = runs(); registry.register(write);
    await expect(new AgentToolExecutor(registry, repository as never).execute({ toolName: 'task_creation', arguments: { title: 'Follow up' }, permittedTools: ['task_creation'], simulation: true }, context())).resolves.toEqual({ status: 'simulated' });
    expect(execute).not.toHaveBeenCalled();
  });

  it('requires approval for exact high-risk arguments and enforces rate limits', async () => {
    const execute = vi.fn(() => Promise.resolve({ status: 'created' }));
    const write = definition({ name: 'task_creation', requiredPermissions: ['tasks.manage'], risk: 'sensitive write', idempotency: 'generated', approval: 'always', inputSchema: z.object({ title: z.string() }).strict(), outputSchema: z.object({ status: z.string() }), execute, rateLimit: { limit: 1, windowMs: 60_000 } });
    const registry = new AgentToolRegistry(), repository = runs(); repository.reserveTool.mockResolvedValue({ execution: { _id: '507f1f77bcf86cd799439014', status: 'pending_approval' }, duplicate: false }); registry.register(write);
    const executor = new AgentToolExecutor(registry, repository as never);
    await expect(executor.execute({ toolName: 'task_creation', arguments: { title: 'A' }, permittedTools: ['task_creation'] }, context())).resolves.toMatchObject({ status: 'pending_approval' });
    expect(execute).not.toHaveBeenCalled();
    await expect(executor.execute({ toolName: 'task_creation', arguments: { title: 'B' }, permittedTools: ['task_creation'] }, context())).rejects.toMatchObject({ status: 429 });
  });
});
