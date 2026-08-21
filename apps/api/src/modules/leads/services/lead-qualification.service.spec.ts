import { describe, expect, it, vi } from 'vitest';
import { LeadQualificationService } from './lead-qualification.service.js';

const valid = { score: 82, qualification: 'sales_qualified', intent: 'buying', summary: 'Ready this quarter.', recommendedAction: 'Schedule discovery', suggestedReply: 'Let us schedule a call.', confidence: 0.91 } as const;
function setup(structured: unknown = valid) {
  const controlPlane = { execute: vi.fn().mockResolvedValue({ context: { provider: 'openai', model: 'gpt-4.1-mini' }, response: { structured, usage: { inputTokens: 20, outputTokens: 30 }, costUsd: 0.001 } }) };
  const pii = { redact: vi.fn((text: string) => text.replace('buyer@example.com', '[EMAIL]')) };
  const results = { save: vi.fn((value) => Promise.resolve({ _id: 'result-1', ...value })) };
  const config = { get: vi.fn((key: string) => ({ 'ai.provider': 'openai', 'ai.timeoutMs': 500, 'ai.developmentMockFallback': false }[key])) };
  return { service: new LeadQualificationService(controlPlane as never, pii as never, results as never, config as never), controlPlane, pii, results };
}
describe('lead qualification flow', () => {
  it('redacts PII, disables tools, validates output, then persists it', async () => {
    const value = setup();
    const response = await value.service.qualify({ workspaceId: '64b64b64b64b64b64b64b64b', userId: '64b64b64b64b64b64b64b64c' }, { text: 'Email buyer@example.com about pricing' });
    expect(response).toMatchObject(valid);
    expect(value.controlPlane.execute).toHaveBeenCalledWith(expect.objectContaining({ permittedTools: [], tools: [], dataClassification: 'restricted', promptVersion: 'lead-qualification.v1' }));
    expect(value.controlPlane.execute.mock.calls[0]![0].messages[1].content).toContain('[EMAIL]');
    expect(value.results.save).toHaveBeenCalledWith(expect.objectContaining({ result: valid, costUsd: 0.001 }));
  });
  it('never persists unvalidated provider output', async () => {
    const value = setup({ ...valid, score: 101 });
    await expect(value.service.qualify({ workspaceId: '64b64b64b64b64b64b64b64b', userId: '64b64b64b64b64b64b64b64c' }, { text: 'Interested' })).rejects.toThrow();
    expect(value.results.save).not.toHaveBeenCalled();
  });
});
