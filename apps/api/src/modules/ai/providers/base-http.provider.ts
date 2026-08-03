import {
  AiProviderError,
  type AiRequest,
  type AiResponse,
  type AiStreamChunk,
} from './ai-provider.interface.js';
export abstract class BaseHttpAiProvider {
  protected async json(url: string, init: RequestInit, timeoutMs: number, signal?: AbortSignal) {
    const controller = new AbortController();
    const abort = () => controller.abort(signal?.reason);
    signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(() => controller.abort(new Error('AI provider timeout')), timeoutMs);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      if (!response.ok)
        throw new AiProviderError(
          `AI provider returned ${response.status}`,
          response.status === 429 || response.status >= 500,
          response.status,
          response.status === 429 ? this.retryAfterMs(response.headers.get('retry-after')) : undefined,
        );
      return (await response.json()) as Record<string, unknown>;
    } catch (error) {
      if (error instanceof AiProviderError) throw error;
      throw new AiProviderError(
        error instanceof Error ? error.message : 'AI provider failed',
        true,
      );
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
    }
  }
  private retryAfterMs(value: string | null) {
    if (!value) return undefined;
    const seconds = Number(value);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000);
    const date = Date.parse(value);
    return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now());
  }
  protected response(content: string, inputTokens = 0, outputTokens = 0): AiResponse {
    return { content, usage: { inputTokens, outputTokens } };
  }
  protected async *single(
    request: AiRequest,
    call: () => Promise<AiResponse>,
  ): AsyncIterable<AiStreamChunk> {
    if (request.signal?.aborted) throw request.signal.reason;
    const result = await call();
    yield { content: result.content, done: false };
    yield { content: '', done: true, usage: result.usage };
  }
}
