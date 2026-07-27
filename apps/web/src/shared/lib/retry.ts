import { normalizeApiError } from './api-error';

export interface RetryOptions {
  baseDelayMs?: number;
  maxAttempts?: number;
  maxDelayMs?: number;
  signal?: AbortSignal;
}

export function retryDelay(attempt: number, baseDelayMs = 500, maxDelayMs = 4_000) {
  return Math.min(baseDelayMs * 2 ** Math.max(0, attempt), maxDelayMs);
}

export function shouldRetry(failureCount: number, error: unknown, maxAttempts = 2) {
  return failureCount < maxAttempts && normalizeApiError(error).retryable;
}

export async function withRetry<Result>(operation: (signal?: AbortSignal) => Promise<Result>, options: RetryOptions = {}) {
  const { baseDelayMs = 500, maxAttempts = 3, maxDelayMs = 4_000, signal } = options;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    signal?.throwIfAborted();
    try {
      return await operation(signal);
    } catch (error) {
      if (attempt === maxAttempts - 1 || !normalizeApiError(error).retryable) throw error;
      await mockDelay(retryDelay(attempt, baseDelayMs, maxDelayMs), signal);
    }
  }
  throw new Error('Retry attempts exhausted.');
}

export function mockDelay(milliseconds = 300, signal?: AbortSignal) {
  if (milliseconds < 0 || !Number.isFinite(milliseconds)) return Promise.reject(new RangeError('Delay must be a finite non-negative number.'));
  return new Promise<void>((resolve, reject) => {
    const abortError = () => signal?.reason instanceof Error ? signal.reason : new DOMException('The operation was aborted.', 'AbortError');
    if (signal?.aborted) { reject(abortError()); return; }
    const timer = setTimeout(resolve, milliseconds);
    signal?.addEventListener('abort', () => { clearTimeout(timer); reject(abortError()); }, { once: true });
  });
}
