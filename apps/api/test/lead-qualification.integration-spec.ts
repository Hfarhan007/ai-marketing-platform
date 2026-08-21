import { describe, expect, it, vi } from 'vitest';
import { MockAiProvider } from '../src/modules/ai/providers/mock.provider.js';
import { LeadQualificationService } from '../src/modules/leads/services/lead-qualification.service.js';

describe('lead qualification with deterministic mock provider', () => {
  it('validates and saves the exact structured result', async () => {
    const output = { score: 67, qualification: 'marketing_qualified', intent: 'researching', summary: 'Comparing solutions.', recommendedAction: 'Send comparison guide', suggestedReply: 'Here is a concise comparison.', confidence: 0.78 };
    const provider = new MockAiProvider(JSON.stringify(output));
    const controlPlane = { execute: vi.fn(async (command) => {
      const response = await provider.chat({ ...command, model: 'deterministic-mock', requestId: command.requestId!, messages: command.messages!, maxTokens: command.budget.maxOutputTokens });
      return { context: { provider: 'mock', model: 'deterministic-mock' }, response: { ...response, structured: JSON.parse(response.content), provider: 'mock', model: 'deterministic-mock', costUsd: 0 } };
    }) };
    const saved: unknown[] = [];
    const repository = { save: vi.fn((value) => { saved.push(value); return Promise.resolve({ _id: 'saved-1' }); }) };
    const config = { get: (key: string) => ({ 'ai.provider': 'ollama', 'ai.timeoutMs': 1_000, 'ai.developmentMockFallback': true }[key]) };
    const service = new LeadQualificationService(controlPlane as never, { redact: (v: string) => v } as never, repository as never, config as never);
    const result = await service.qualify({ workspaceId: '64b64b64b64b64b64b64b64b', userId: '64b64b64b64b64b64b64b64c' }, { text: 'We are comparing CRMs.' });
    expect(result).toMatchObject(output);
    expect(saved).toHaveLength(1);
    expect(controlPlane.execute.mock.calls[0]![0].allowedProviders).toEqual(['ollama', 'mock']);
  });
});
