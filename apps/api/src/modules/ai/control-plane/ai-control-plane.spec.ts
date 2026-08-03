import { describe, expect, it, vi } from 'vitest';
import { AiControlPlaneService } from './ai-control-plane.service.js';
const base = {
  correlationId: 'correlation',
  workspaceId: 'workspace',
  userId: 'user',
  agentId: 'agent',
  feature: 'inbox_suggestions',
  purpose: 'draft_reply',
  promptKey: 'reply',
  promptVariables: { customer: 'Ava' },
  knowledgeScope: ['support'],
  permittedTools: ['search_knowledge'],
  dataClassification: 'confidential' as const,
  retentionPolicy: { retainPrompt: false, days: 0 },
  budget: { maxCostUsd: 0.5, maxOutputTokens: 200 },
  deadline: new Date(Date.now() + 10_000),
};
describe('AI control plane', () => {
  it('builds complete context and resolves versioned prompts through the gateway', async () => {
    const gateway = { execute: vi.fn().mockResolvedValue({ content: 'draft', provider: 'ollama', model: 'mock', usage: { inputTokens: 3, outputTokens: 1 } }) };
    const prompts = { resolve: vi.fn().mockResolvedValue({ content: 'Reply to {{customer}}', version: 4 }) };
    const policies = { resolve: vi.fn().mockResolvedValue({ allowedProviders: ['ollama'], remainingTokens: 1_000, remainingCostUsd: 2 }) };
    const tools = { execute: vi.fn().mockResolvedValue([]) };
    const result = await new AiControlPlaneService(gateway as never, prompts as never, policies as never, tools).execute(base);
    expect(result.context).toMatchObject({ correlationId: 'correlation', workspaceId: 'workspace', userId: 'user', agentId: 'agent', feature: 'inbox_suggestions', purpose: 'draft_reply', provider: 'ollama', model: 'mock', promptVersion: '4', knowledgeScope: ['support'], permittedTools: ['search_knowledge'], dataClassification: 'confidential', retentionPolicy: { retainPrompt: false }, budget: { maxCostUsd: 0.5 } });
    expect(gateway.execute).toHaveBeenCalledWith(expect.objectContaining({ messages: [{ role: 'system', content: 'Reply to Ava' }], maxCostUsd: 0.5, maxTokens: 200 }));
  });
  it('rejects expired deadlines before provider invocation', async () => {
    const gateway = { execute: vi.fn() };
    const service = new AiControlPlaneService(gateway as never, {} as never, {} as never, {} as never);
    await expect(service.execute({ ...base, deadline: new Date(Date.now() - 1) })).rejects.toThrow('deadline');
    expect(gateway.execute).not.toHaveBeenCalled();
  });
  it('executes only returned tool calls through the bounded tool port', async () => {
    const gateway = { execute: vi.fn().mockResolvedValue({ content: '', provider: 'ollama', model: 'mock', usage: { inputTokens: 1, outputTokens: 1 }, toolCalls: [{ name: 'search_knowledge', arguments: { query: 'x' } }] }) };
    const tools = { execute: vi.fn().mockResolvedValue([{ ok: true }]) };
    const service = new AiControlPlaneService(gateway as never, { resolve: vi.fn().mockResolvedValue({ content: 'x', version: 1 }) } as never, { resolve: vi.fn().mockResolvedValue({ allowedProviders: ['ollama'], remainingTokens: 10, remainingCostUsd: 1 }) } as never, tools);
    await service.execute(base);
    expect(tools.execute).toHaveBeenCalledWith([{ name: 'search_knowledge', arguments: { query: 'x' } }], expect.objectContaining({ permittedTools: ['search_knowledge'] }));
  });
});
