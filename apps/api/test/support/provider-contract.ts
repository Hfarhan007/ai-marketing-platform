import { expect } from 'vitest';

export interface AiProviderContract {
  complete(input: { messages: Array<{ role: string; content: string }>; model: string }): Promise<{ content: string; model: string; usage: { inputTokens: number; outputTokens: number } }>;
}

export async function verifyAiProviderContract(provider: AiProviderContract): Promise<void> {
  const response = await provider.complete({ model: 'contract-test', messages: [{ role: 'user', content: 'Reply with CONTRACT_OK' }] });
  expect(response.content.length).toBeGreaterThan(0);
  expect(response.model).toBeTruthy();
  expect(response.usage.inputTokens).toBeGreaterThanOrEqual(0);
  expect(response.usage.outputTokens).toBeGreaterThanOrEqual(0);
}
