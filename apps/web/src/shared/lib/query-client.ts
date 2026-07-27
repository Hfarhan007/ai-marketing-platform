import { QueryClient } from '@tanstack/react-query';
import { errorReporter } from '../../observability';
import { normalizeApiError } from './api-error';
import { retryDelay, shouldRetry } from './retry';

export function createApplicationQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: { onError: (error) => errorReporter.capture(normalizeApiError(error), { boundary: 'query-mutation' }), retry: false },
      queries: {
        refetchOnReconnect: true,
        refetchOnWindowFocus: false,
        retry: shouldRetry,
        retryDelay: (attempt) => retryDelay(attempt),
        staleTime: 30_000,
        throwOnError: (error) => (normalizeApiError(error).status ?? 0) >= 500,
      },
    },
  });
}
