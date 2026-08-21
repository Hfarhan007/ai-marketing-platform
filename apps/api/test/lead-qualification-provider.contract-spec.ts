import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { OpenAiProvider } from '../src/modules/ai/providers/openai.provider.js';

describe('OpenAI structured-output provider contract', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('keeps the API key in the backend request and maps token usage', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: '{"score":50}' } }], usage: { prompt_tokens: 8, completion_tokens: 4 } }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    const provider = new OpenAiProvider(new ConfigService({ ai: { openaiApiKey: 'server-only-key', timeoutMs: 100, openaiBaseUrl: 'https://provider.test/v1' } }));
    const response = await provider.chat({ requestId: 'r', correlationId: 'c', workspaceId: 'w', feature: 'lead_qualification', model: 'gpt-4.1-mini', messages: [{ role: 'user', content: 'qualify' }], maxTokens: 100, jsonSchema: { type: 'object' } });
    expect(response.usage).toEqual({ inputTokens: 8, outputTokens: 4 });
    expect(fetchMock).toHaveBeenCalledWith('https://provider.test/v1/chat/completions', expect.objectContaining({ headers: expect.objectContaining({ authorization: 'Bearer server-only-key' }) }));
  });
});
