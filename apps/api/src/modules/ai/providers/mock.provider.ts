import type { AiProvider, AiRequest, AiStreamChunk } from './ai-provider.interface.js';
export class MockAiProvider implements AiProvider {
  readonly name = 'ollama' as const;
  failures = 0;
  constructor(private readonly output = 'mock response') {}
  chat(r: AiRequest) {
    if (this.failures-- > 0) return Promise.reject(new Error('mock failure'));
    return Promise.resolve({
      content: r.jsonSchema ? JSON.stringify({ value: this.output }) : this.output,
      structured: r.jsonSchema ? { value: this.output } : undefined,
      usage: {
        inputTokens: r.messages.reduce((n, m) => n + m.content.split(/\\s+/u).length, 0),
        outputTokens: this.output.split(/\\s+/u).length,
      },
    });
  }
  embed(r: Omit<AiRequest, 'messages'> & { inputs: string[] }) {
    return Promise.resolve({
      vectors: r.inputs.map((_, i) => [i, 1]),
      usage: { inputTokens: r.inputs.length, outputTokens: 0 },
    });
  }
  async *stream(r: AiRequest): AsyncIterable<AiStreamChunk> {
    await Promise.resolve();
    for (const word of this.output.split(' ')) {
      if (r.signal?.aborted) throw r.signal.reason;
      yield { content: `${word} `, done: false };
    }
    yield {
      content: '',
      done: true,
      usage: { inputTokens: 1, outputTokens: this.output.split(' ').length },
    };
  }
  health() {
    return Promise.resolve(true);
  }
}
