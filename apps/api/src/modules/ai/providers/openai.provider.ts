import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseHttpAiProvider } from './base-http.provider.js';
import type { AiProvider, AiProviderName, AiRequest } from './ai-provider.interface.js';
@Injectable()
export class OpenAiProvider extends BaseHttpAiProvider implements AiProvider {
  readonly name: AiProviderName;
  constructor(
    private readonly config: ConfigService,
    private readonly options: {
      name: AiProviderName;
      apiKeyConfig: string;
      baseUrlConfig: string;
      defaultBaseUrl: string;
    } = {
      name: 'openai',
      apiKeyConfig: 'ai.openaiApiKey',
      baseUrlConfig: 'ai.openaiBaseUrl',
      defaultBaseUrl: 'https://api.openai.com/v1',
    },
  ) {
    super();
    this.name = options.name;
  }
  private headers() {
    const key = this.config.get<string>(this.options.apiKeyConfig);
    if (!key) throw new Error(`${this.name} is not configured`);
    return { authorization: `Bearer ${key}`, 'content-type': 'application/json' };
  }
  async chat(r: AiRequest) {
    const v = await this.json(
      `${this.config.get<string>(this.options.baseUrlConfig) ?? this.options.defaultBaseUrl}/chat/completions`,
      {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          model: r.model,
          messages: r.messages,
          max_tokens: r.maxTokens,
          temperature: r.temperature,
          tools: r.tools?.map((t) => ({
            type: 'function',
            function: { name: t.name, description: t.description, parameters: t.inputSchema },
          })),
          response_format: r.jsonSchema
            ? { type: 'json_schema', json_schema: { name: 'response', schema: r.jsonSchema } }
            : undefined,
        }),
      },
      this.config.get<number>('ai.timeoutMs') ?? 30_000,
      r.signal,
    );
    const choices =
        (v.choices as Array<{
          message: {
            content?: string;
            tool_calls?: Array<{ function: { name: string; arguments: string } }>;
          };
        }>) ?? [],
      u = v.usage as { prompt_tokens?: number; completion_tokens?: number } | undefined;
    const response = this.response(
        choices[0]?.message.content ?? '',
        u?.prompt_tokens,
        u?.completion_tokens,
      ),
      toolCalls = choices[0]?.message.tool_calls?.map((call) => ({
        name: call.function.name,
        arguments: JSON.parse(call.function.arguments) as Record<string, unknown>,
      }));
    return toolCalls?.length ? { ...response, toolCalls } : response;
  }
  async embed(r: Omit<AiRequest, 'messages'> & { inputs: string[] }) {
    const v = await this.json(
      `${this.config.get<string>(this.options.baseUrlConfig) ?? this.options.defaultBaseUrl}/embeddings`,
      {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({ model: r.model, input: r.inputs }),
      },
      this.config.get<number>('ai.timeoutMs') ?? 30_000,
      r.signal,
    );
    return {
      vectors: ((v.data as Array<{ embedding: number[] }>) ?? []).map((x) => x.embedding),
      usage: {
        inputTokens: (v.usage as { prompt_tokens?: number } | undefined)?.prompt_tokens ?? 0,
        outputTokens: 0,
      },
    };
  }
  stream(r: AiRequest) {
    return this.single(r, () => this.chat(r));
  }
  health() {
    return Promise.resolve(Boolean(this.config.get<string>(this.options.apiKeyConfig)));
  }
}
