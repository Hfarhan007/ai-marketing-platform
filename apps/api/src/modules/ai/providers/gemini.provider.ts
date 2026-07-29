import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseHttpAiProvider } from './base-http.provider.js';
import type { AiProvider, AiRequest } from './ai-provider.interface.js';
@Injectable()
export class GeminiProvider extends BaseHttpAiProvider implements AiProvider {
  readonly name = 'gemini' as const;
  constructor(private readonly c: ConfigService) {
    super();
  }
  private key() {
    const k = this.c.get<string>('ai.geminiApiKey');
    if (!k) throw new Error('Gemini is not configured');
    return k;
  }
  private base() {
    return (
      this.c.get<string>('ai.geminiBaseUrl') ?? 'https://generativelanguage.googleapis.com/v1beta'
    );
  }
  async chat(r: AiRequest) {
    const v = await this.json(
        `${this.base()}/models/${encodeURIComponent(r.model)}:generateContent?key=${this.key()}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            contents: r.messages.map((m) => ({
              role: m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: m.content }],
            })),
            generationConfig: {
              maxOutputTokens: r.maxTokens,
              temperature: r.temperature,
              responseMimeType: r.jsonSchema ? 'application/json' : undefined,
              responseSchema: r.jsonSchema,
            },
          }),
        },
        this.c.get<number>('ai.timeoutMs') ?? 30_000,
        r.signal,
      ),
      c = (v.candidates as Array<{ content: { parts: Array<{ text: string }> } }>) ?? [],
      u = v.usageMetadata as
        { promptTokenCount?: number; candidatesTokenCount?: number } | undefined;
    return this.response(
      c[0]?.content.parts.map((p) => p.text).join('') ?? '',
      u?.promptTokenCount,
      u?.candidatesTokenCount,
    );
  }
  async embed(r: Omit<AiRequest, 'messages'> & { inputs: string[] }) {
    const vectors = [] as number[][];
    for (const input of r.inputs) {
      const v = await this.json(
        `${this.base()}/models/${encodeURIComponent(r.model)}:embedContent?key=${this.key()}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ content: { parts: [{ text: input }] } }),
        },
        this.c.get<number>('ai.timeoutMs') ?? 30_000,
        r.signal,
      );
      vectors.push((v.embedding as { values: number[] }).values);
    }
    return { vectors, usage: { inputTokens: 0, outputTokens: 0 } };
  }
  stream(r: AiRequest) {
    return this.single(r, () => this.chat(r));
  }
  health() {
    return Promise.resolve(Boolean(this.c.get<string>('ai.geminiApiKey')));
  }
}
