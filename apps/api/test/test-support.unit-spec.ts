import { describe, expect, it } from 'vitest';
import { TestDataFactory } from './support/data-factories.js';
import { verifyAiProviderContract } from './support/provider-contract.js';
import { isolatedRedisUrl } from './support/redis-test-environment.js';

describe('backend test support', () => {
  it('creates deterministic, tenant-owned relational fixtures', () => {
    const first = new TestDataFactory('repeatable');
    const second = new TestDataFactory('repeatable');
    const workspace = first.workspace();
    const contact = first.contact(String(workspace._id));
    expect(new TestDataFactory('repeatable').workspace()).toEqual(workspace);
    expect(second.objectId('workspace-1')).toBe(workspace._id);
    expect(contact).toMatchObject({ workspaceId: workspace._id, version: 1 });
  });

  it('allocates an isolated Redis database without changing the host', () => {
    expect(isolatedRedisUrl('redis://localhost:6379/0', 12)).toBe('redis://localhost:6379/12');
    expect(() => isolatedRedisUrl('redis://localhost:6379', 16)).toThrow();
  });

  it('enforces the AI provider response and usage contract', async () => {
    await verifyAiProviderContract({ complete: ({ model }) => Promise.resolve({ content: 'CONTRACT_OK', model, usage: { inputTokens: 4, outputTokens: 2 } }) });
  });
});
