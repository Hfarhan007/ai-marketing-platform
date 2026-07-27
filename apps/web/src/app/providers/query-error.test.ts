import { describe, expect, it } from 'vitest';
import { normalizeQueryError, shouldRetryQuery } from './query-error';

describe('query error policy', () => {
  it('normalizes response status and retries only transient failures', () => {
    const serverError = normalizeQueryError({ response: { status: 503 } });
    expect(serverError).toMatchObject({ retryable: true, status: 503 });
    expect(shouldRetryQuery(0, { response: { status: 503 } })).toBe(true);
    expect(shouldRetryQuery(0, { response: { status: 404 } })).toBe(false);
    expect(shouldRetryQuery(2, new Error('network unavailable'))).toBe(false);
  });
});
