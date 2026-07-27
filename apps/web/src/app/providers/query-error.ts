import { normalizeApiError } from '@/shared/lib/api-error';
import { shouldRetry } from '@/shared/lib/retry';

export type NormalizedQueryError = ReturnType<typeof normalizeApiError>;
export const normalizeQueryError = normalizeApiError;
export const shouldRetryQuery = shouldRetry;
