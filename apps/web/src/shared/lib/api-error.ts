import type { ApiError } from '@/shared/types';

function statusCode(error: unknown) {
  if (typeof error === 'object' && error !== null && 'status' in error && typeof error.status === 'number') return error.status;
  if (typeof error === 'object' && error !== null && 'response' in error && typeof error.response === 'object' && error.response !== null && 'status' in error.response && typeof error.response.status === 'number') return error.response.status;
  return undefined;
}

export function normalizeApiError(error: unknown): ApiClientError {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return new ApiClientError('The request was cancelled.', { cause: error, code: 'REQUEST_ABORTED', retryable: false });
  }
  const status = statusCode(error);
  const retryable = status === undefined || status === 408 || status === 425 || status === 429 || status >= 500;
  const message = error instanceof Error && error.message.trim()
    ? error.message
    : status ? `Request failed with status ${status}.` : 'The request could not be completed.';
  return new ApiClientError(message, {
    cause: error,
    code: status ? `HTTP_${status}` : 'UNKNOWN_ERROR',
    retryable,
    ...(status === undefined ? {} : { status }),
  });
}

export class ApiClientError extends Error implements ApiError {
  readonly code: string;
  readonly details?: Readonly<Record<string, unknown>>;
  readonly retryable: boolean;
  readonly status?: number;
  constructor(message: string, options: Omit<ApiError, 'message'>) {
    super(message, { cause: options.cause });
    this.name = 'ApiClientError';
    this.code = options.code;
    this.retryable = options.retryable;
    if (options.details) this.details = options.details;
    if (options.status !== undefined) this.status = options.status;
  }
}
