import { describe, it } from 'vitest';
import { verifyAiProviderContract } from './support/provider-contract.js';

describe('deterministic AI provider contract', () => {
  it('returns model identity, content, and non-negative token usage', async () => {
    await verifyAiProviderContract({
      complete: ({ messages, model }) => Promise.resolve({
        content: `fake:${messages.at(-1)?.content ?? ''}`,
        model,
        usage: { inputTokens: messages.reduce((sum, message) => sum + message.content.split(/\s+/u).length, 0), outputTokens: 2 },
      }),
    });
  });
});
