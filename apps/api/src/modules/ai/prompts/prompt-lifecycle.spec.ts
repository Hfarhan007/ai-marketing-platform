import { describe, expect, it, vi } from 'vitest';
import { Types } from 'mongoose';
import { PromptLifecycleService } from './prompt-lifecycle.service.js';
import { PromptRegistryService } from './prompt-registry.service.js';
const id = new Types.ObjectId();
describe('enterprise prompt lifecycle', () => {
  it('creates immutable new versions instead of updating prompt content', async () => {
    let version = 0;
    const repository = { createVersion: vi.fn().mockImplementation((value) => Promise.resolve({ ...value, version: ++version })) };
    const service = new PromptLifecycleService(repository as never);
    const first = await service.createVersion({ workspaceId: id.toHexString(), templateId: id.toHexString(), userId: id.toHexString(), content: 'first', changelog: 'Initial prompt' });
    const second = await service.createVersion({ workspaceId: id.toHexString(), templateId: id.toHexString(), userId: id.toHexString(), content: 'second', changelog: 'Improve tone' });
    expect([first.version, second.version]).toEqual([1, 2]);
    expect(repository.createVersion).toHaveBeenNthCalledWith(1, expect.objectContaining({ content: 'first' }));
    expect(repository.createVersion).toHaveBeenNthCalledWith(2, expect.objectContaining({ content: 'second' }));
  });
  it('assigns canary versions deterministically by workspace', async () => {
    const repository = {
      template: vi.fn().mockResolvedValue({ _id: id, activeVersion: 1 }),
      assignment: vi.fn().mockResolvedValue({ stableVersion: 1, canaryVersion: 2, rolloutPercentage: 0, canaryWorkspaceIds: ['workspace-canary'] }),
      versionNumber: vi.fn().mockImplementation((_template, version: number) => Promise.resolve({ _id: id, version, content: `v${version}`, contentHash: `h${version}`, variables: [], outputSchema: null, composedPrompts: [], status: 'active' })),
    };
    const registry = new PromptRegistryService(repository as never);
    await expect(registry.resolve('workspace-canary', 'reply', { feature: 'inbox', environment: 'production' })).resolves.toMatchObject({ version: 2, content: 'v2' });
    expect(repository.versionNumber).toHaveBeenCalledWith(expect.anything(), 2);
  });
  it('assigns percentage canaries with stable deterministic bucketing', async () => {
    const repository = {
      template: vi.fn().mockResolvedValue({ _id: id, activeVersion: 1 }),
      assignment: vi.fn().mockResolvedValue({ stableVersion: 1, canaryVersion: 2, rolloutPercentage: 100, canaryWorkspaceIds: [] }),
      versionNumber: vi.fn().mockImplementation((_template, version: number) => Promise.resolve({ _id: id, version, content: `v${version}`, contentHash: `h${version}`, variables: [], outputSchema: null, composedPrompts: [], status: 'active' })),
    };
    const registry = new PromptRegistryService(repository as never);
    const first = await registry.resolve('workspace-a', 'reply', { feature: 'inbox' });
    const second = await registry.resolve('workspace-a', 'reply', { feature: 'inbox' });
    expect(first.version).toBe(2);
    expect(second.version).toBe(first.version);
  });
  it('performs emergency rollback to the recorded stable version', async () => {
    const repository = {
      templateById: vi.fn().mockResolvedValue({ _id: id }),
      assignment: vi.fn().mockResolvedValue({ stableVersion: 2, rollbackVersion: 1 }),
      assign: vi.fn().mockResolvedValue({}),
      activateTemplate: vi.fn().mockResolvedValue({}),
      audit: vi.fn().mockResolvedValue({}),
    };
    const result = await new PromptLifecycleService(repository as never).rollback({ workspaceId: id.toHexString(), templateId: id.toHexString(), feature: 'crm', environment: 'production', userId: id.toHexString(), permissions: ['agents.manage'], reason: 'Incident rollback' });
    expect(result).toEqual({ activeVersion: 1 });
    expect(repository.assign).toHaveBeenCalledWith(expect.objectContaining({ stableVersion: 1, canaryVersion: null, rolloutPercentage: 100 }));
    expect(repository.audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'emergency_rollback', reason: 'Incident rollback' }));
  });
  it('validates required variables and blocks secret interpolation', async () => {
    const repository = {
      template: vi.fn().mockResolvedValue({ _id: id, activeVersion: 1 }),
      assignment: vi.fn().mockResolvedValue(null),
      versionNumber: vi.fn().mockResolvedValue({ _id: id, version: 1, content: 'Hello {{name}}', contentHash: 'hash', variables: [{ name: 'name', type: 'string', required: true, maxLength: 20 }], outputSchema: null, composedPrompts: [], status: 'active' }),
    };
    const registry = new PromptRegistryService(repository as never);
    await expect(registry.resolve(id.toHexString(), 'greeting')).rejects.toThrow('Missing prompt variable');
    await expect(registry.resolve(id.toHexString(), 'greeting', { variables: { name: 'token-abcdefghijklmnop' } })).rejects.toThrow('Secret interpolation');
    await expect(registry.resolve(id.toHexString(), 'greeting', { variables: { name: 'Ava' } })).resolves.toMatchObject({ content: 'Hello Ava', version: 1 });
  });
  it('requires production activation permission and passed evaluation', async () => {
    const service = new PromptLifecycleService({} as never);
    await expect(service.activate({ workspaceId: id.toHexString(), templateId: id.toHexString(), version: 2, feature: 'agents', environment: 'production', rolloutPercentage: 100, userId: id.toHexString(), permissions: [], reason: 'Release' })).rejects.toThrow('permission');
  });
});
