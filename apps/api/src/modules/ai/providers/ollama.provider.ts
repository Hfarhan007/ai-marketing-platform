import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseHttpAiProvider } from './base-http.provider.js';
import type { AiProvider, AiRequest } from './ai-provider.interface.js';
@Injectable()
export class OllamaProvider extends BaseHttpAiProvider implements AiProvider {
  readonly name = 'ollama' as const;
  constructor(private readonly c: ConfigService) {
    super();
  }
  private url() {
    return this.c.get<string>('ai.ollamaBaseUrl') ?? 'http://127.0.0.1:11434';
  }
  async chat(r: AiRequest) {
    const v = await this.json(
      `${this.url()}/api/chat`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: r.model,
          messages: r.messages,
          stream: false,
          format: r.jsonSchema ? 'json' : undefined,
          options: { temperature: r.temperature, num_predict: r.maxTokens },
        }),
      },
      this.c.get<number>('ai.timeoutMs') ?? 30_000,
      r.signal,
    );
    const m = v.message as { content?: string } | undefined;
    return this.response(
      m?.content ?? '',
      Number(v.prompt_eval_count ?? 0),
      Number(v.eval_count ?? 0),
    );
  }
  async embed(r: Omit<AiRequest, 'messages'> & { inputs: string[] }) {
    const vectors = [] as number[][];
    for (const input of r.inputs) {
      const v = await this.json(
        `${this.url()}/api/embed`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ model: r.model, input }),
        },
        this.c.get<number>('ai.timeoutMs') ?? 30_000,
        r.signal,
      );
      vectors.push(...((v.embeddings as number[][]) ?? []));
    }
    return { vectors, usage: { inputTokens: 0, outputTokens: 0 } };
  }
  stream(r: AiRequest) {
    return this.single(r, () => this.chat(r));
  }
  health() {
    return fetch(`${this.url()}/api/tags`)
      .then((v) => v.ok)
      .catch(() => false);
  }
}
