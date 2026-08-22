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
  const status = statusCode(error),direct=typeof error==='object'&&error!==null?error as{code?:unknown;message?:unknown;retryable?:unknown}:undefined;
  const payload=typeof error==='object'&&error!==null&&'response'in error&&typeof error.response==='object'&&error.response!==null&&'data'in error.response&&typeof error.response.data==='object'&&error.response.data!==null?error.response.data as{error?:{code?:unknown;message?:unknown;details?:unknown}}:undefined,provider=payload?.error;
  const retryable = status === undefined || status === 408 || status === 425 || status === 429 || status >= 500;
  const message = typeof provider?.message==='string'&&provider.message.trim()?provider.message:typeof direct?.message==='string'&&direct.message.trim()?direct.message:error instanceof Error && error.message.trim()
    ? error.message
    : status ? `Request failed with status ${status}.` : 'The request could not be completed.';
  const code=typeof provider?.code==='string'?provider.code:typeof direct?.code==='string'?direct.code:status ? `HTTP_${status}` : 'UNKNOWN_ERROR';
  return new ApiClientError(message, {
    cause: error,
    code,
    retryable,
    ...(typeof provider?.details==='object'&&provider.details!==null?{details:provider.details as Record<string,unknown>}:{}),
    ...(status === undefined ? {} : { status }),
  });
}

export function providerErrorMessage(error:unknown){const normalized=error instanceof ApiClientError?error:normalizeApiError(error),text=`${normalized.code} ${normalized.message}`.toLowerCase();if(/token.*expired|expired.*token/u.test(text))return'Your provider access token has expired. Reconnect the integration to continue.';if(/reauthor|oauth.*invalid|token_invalid|authorization expired|http_401/u.test(text))return'This connection must be authorized again. Select Reconnect and complete provider authorization.';if(/permission|missing scope|http_403/u.test(text))return'The connected account is missing a required provider permission. Update the app permissions or account role, then reconnect.';if(/page.*(unavailable|missing|not found|access)|select at least one facebook page/u.test(text))return'The selected Facebook Page is unavailable. Check Page access or select another Page.';if(/ad.?account.*(unavailable|missing|not found|access)|select a meta ad account/u.test(text))return'The selected Ad Account is unavailable. Check account access or select another Ad Account.';if(/webhook.*(disconnect|subscription|unavailable|failed)/u.test(text))return'The provider webhook is disconnected. Reconfigure the connection and enable webhook subscription again.';if(normalized.retryable||normalized.status===429||/rate.?limit|temporar|timeout|network|dns|connection reset/u.test(text))return'The provider is temporarily unavailable. Please wait a moment and try again.';return normalized.message;}

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
