import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient, createApplicationQueryClient, createLogger, createStorage, mockDelay, normalizeApiError, retryDelay, shouldRetry, withRetry } from './index';

describe('API errors and retry policy', () => {
  afterEach(() => vi.useRealTimers());
  it('normalizes status errors and cancellation', () => {
    expect(normalizeApiError({ status: 503 })).toMatchObject({ code: 'HTTP_503', retryable: true, status: 503 });
    expect(normalizeApiError({ status: 400 })).toMatchObject({ retryable: false, status: 400 });
    expect(normalizeApiError(new DOMException('cancelled', 'AbortError'))).toMatchObject({ code: 'REQUEST_ABORTED', retryable: false });
    expect(shouldRetry(1, { status: 503 })).toBe(true);
    expect(retryDelay(4, 100, 500)).toBe(500);
  });
  it('supports abortable mock delays and retry success', async () => {
    vi.useFakeTimers();
    const operation = vi.fn<() => Promise<string>>().mockRejectedValueOnce({ status: 503 }).mockResolvedValue('ok');
    const promise = withRetry(operation, { baseDelayMs: 10 });
    await vi.advanceTimersByTimeAsync(10);
    await expect(promise).resolves.toBe('ok');
    const controller = new AbortController();
    const delayed = mockDelay(100, controller.signal);
    controller.abort(new DOMException('cancelled', 'AbortError'));
    await expect(delayed).rejects.toBeInstanceOf(DOMException);
  });
  it('configures the API and query clients with normalized failure policy', async () => {
    expect(apiClient.defaults.timeout).toBe(15_000);
    const failure = Object.assign(new Error('Unavailable'), { response: { status: 503 } });
    await expect(apiClient.get('/failure', { adapter: () => Promise.reject(failure) })).rejects.toMatchObject({ code: 'HTTP_503', status: 503 });
    const queryClient = createApplicationQueryClient();
    expect(queryClient.getDefaultOptions().queries?.staleTime).toBe(30_000);
    expect(queryClient.getDefaultOptions().mutations?.retry).toBe(false);
    queryClient.clear();
  });
});

describe('typed storage and logging', () => {
  it('round-trips validated values and removes corrupt data', () => {
    const store = createStorage(localStorage, 'typed', { parse: (value) => {
      if (typeof value !== 'object' || value === null || !('name' in value) || typeof value.name !== 'string') throw new Error('Invalid');
      return { name: value.name };
    } });
    store.set({ name: 'Amina' });
    expect(store.get()).toEqual({ name: 'Amina' });
    localStorage.setItem('typed', '{bad');
    expect(store.get()).toBeNull();
    expect(localStorage.getItem('typed')).toBeNull();
  });
  it('filters levels and redacts sensitive context', () => {
    const sink = vi.fn();
    const logger = createLogger(sink, 'info');
    logger.debug('hidden');
    logger.info('request', { token: 'secret', workspace: 'demo' });
    expect(sink).toHaveBeenCalledOnce();
    expect(sink.mock.calls[0]?.[0]).toMatchObject({ context: { token: '[REDACTED]', workspace: 'demo' }, level: 'info' });
  });
});
