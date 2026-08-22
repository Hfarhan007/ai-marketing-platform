export type ProviderFailureKind =
  | 'rate_limit'
  | 'authentication'
  | 'permission'
  | 'invalid_request'
  | 'provider_failure'
  | 'timeout'
  | 'dns'
  | 'connection_reset'
  | 'malformed_payload'
  | 'unknown';

export interface ProviderFailure {
  code: string;
  kind: ProviderFailureKind;
  message: string;
  retryable: boolean;
  status?: number;
  retryAfterMs?: number;
}

export class ProviderRequestError extends Error {
  constructor(
    readonly failure: ProviderFailure,
    options?: ErrorOptions,
  ) {
    super(failure.message, options);
    this.name = 'ProviderRequestError';
  }
  get code() {
    return this.failure.code;
  }
  get retryable() {
    return this.failure.retryable;
  }
  get status() {
    return this.failure.status;
  }
  get retryAfterMs() {
    return this.failure.retryAfterMs;
  }
}

function errorText(value: unknown, fallback: string): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : fallback;
}

export function retryAfterMs(value: string | null, now = Date.now()) {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, 60_000);
  const date = Date.parse(value);
  return Number.isNaN(date) ? undefined : Math.min(Math.max(0, date - now), 60_000);
}
export function transportFailure(provider: string, error: unknown): ProviderFailure {
  const cause = error instanceof Error && 'cause' in error ? error.cause : error,
    code = typeof cause === 'object' && cause !== null && 'code' in cause ? String(cause.code) : '',
    name = error instanceof Error ? error.name : '';
  if (name === 'TimeoutError' || name === 'AbortError' || code === 'ETIMEDOUT')
    return {
      code: `${provider.toUpperCase()}_NETWORK_TIMEOUT`,
      kind: 'timeout',
      message: `${provider} request timed out`,
      retryable: true,
    };
  if (['ENOTFOUND', 'EAI_AGAIN'].includes(code))
    return {
      code: `${provider.toUpperCase()}_DNS_ERROR`,
      kind: 'dns',
      message: `${provider} host could not be resolved`,
      retryable: true,
    };
  if (['ECONNRESET', 'ECONNREFUSED', 'EPIPE'].includes(code))
    return {
      code: `${provider.toUpperCase()}_CONNECTION_RESET`,
      kind: 'connection_reset',
      message: `${provider} connection failed`,
      retryable: true,
    };
  return {
    code: `${provider.toUpperCase()}_NETWORK_ERROR`,
    kind: 'unknown',
    message: `${provider} network request failed`,
    retryable: true,
  };
}
export function failureOf(error: unknown): ProviderFailure {
  if (error instanceof ProviderRequestError) return error.failure;
  if (typeof error === 'object' && error !== null) {
    const candidate = error as {
      code?: unknown;
      retryable?: unknown;
      status?: unknown;
      providerStatus?: unknown;
      kind?: ProviderFailureKind;
      message?: unknown;
      response?: {
        status?: number;
        data?: { code?: string; message?: string; retryable?: boolean; kind?: ProviderFailureKind };
      };
    };
    const data = candidate.response?.data;
    return {
      code: errorText(candidate.code ?? data?.code, error instanceof Error ? error.name : 'UNKNOWN_ERROR'),
      kind: candidate.kind ?? data?.kind ?? 'unknown',
      message: errorText(data?.message ?? candidate.message, 'Provider operation failed'),
      retryable: Boolean(candidate.retryable ?? data?.retryable),
      ...(typeof candidate.providerStatus === 'number'
        ? { status: candidate.providerStatus }
        : typeof candidate.status === 'number'
          ? { status: candidate.status }
          : typeof candidate.response?.status === 'number'
            ? { status: candidate.response.status }
            : {}),
    };
  }
  return {
    code: 'UNKNOWN_ERROR',
    kind: 'unknown',
    message: 'Provider operation failed',
    retryable: false,
  };
}
export const boundedBackoff = (attempt: number, retryAfter?: number) =>
  Math.min(30_000, Math.max(retryAfter ?? 0, 500 * 2 ** attempt));
