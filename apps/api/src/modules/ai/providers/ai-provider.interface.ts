export type AiProviderName = 'openai' | 'gemini' | 'groq' | 'openrouter' | 'ollama' | 'mock';
export type AiCapability = 'chat' | 'json' | 'vision' | 'embeddings' | 'streaming' | 'tools';
export interface AiMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
}
export interface AiTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}
export interface AiRequest {
  requestId: string;
  correlationId: string;
  workspaceId: string;
  feature: string;
  model: string;
  messages: AiMessage[];
  maxTokens: number;
  temperature?: number;
  jsonSchema?: Record<string, unknown>;
  tools?: AiTool[];
  signal?: AbortSignal;
}
export interface AiUsage {
  inputTokens: number;
  outputTokens: number;
}
export interface AiResponse {
  content: string;
  provider?: AiProviderName;
  model?: string;
  structured?: unknown;
  usage: AiUsage;
  providerRequestId?: string;
  costUsd?: number;
  toolCalls?: Array<{ name: string; arguments: Record<string, unknown> }>;
}
export interface AiStreamChunk {
  content: string;
  done: boolean;
  usage?: AiUsage;
}
export interface AiProvider {
  readonly name: AiProviderName;
  chat(request: AiRequest): Promise<AiResponse>;
  embed(
    request: Omit<AiRequest, 'messages'> & { inputs: string[] },
  ): Promise<{ vectors: number[][]; usage: AiUsage }>;
  stream(request: AiRequest): AsyncIterable<AiStreamChunk>;
  health(): Promise<boolean>;
}
export class AiProviderError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
    readonly status?: number,
    readonly retryAfterMs?: number,
  ) {
    super(message);
  }
}
