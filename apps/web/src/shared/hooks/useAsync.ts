import { useCallback, useEffect, useRef, useState } from 'react';
import { normalizeApiError } from '@/shared/lib/api-error';
import type { ApiError } from '@/shared/types';

export interface AsyncState<Result> { data?: Result; error?: ApiError; loading: boolean }

export function useAsync<Result>() {
  const [state, setState] = useState<AsyncState<Result>>({ loading: false });
  const controller = useRef<AbortController>(null);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; controller.current?.abort(); }, []);
  const cancel = useCallback(() => controller.current?.abort(), []);
  const run = useCallback(async (operation: (signal: AbortSignal) => Promise<Result>) => {
    controller.current?.abort();
    const nextController = new AbortController();
    controller.current = nextController;
    setState((current) => ({ ...(current.data === undefined ? {} : { data: current.data }), loading: true }));
    try {
      const data = await operation(nextController.signal);
      if (mounted.current && !nextController.signal.aborted) setState({ data, loading: false });
      return data;
    } catch (error) {
      if (mounted.current && !nextController.signal.aborted) setState((current) => ({ ...current, error: normalizeApiError(error), loading: false }));
      throw error;
    }
  }, []);
  return { ...state, cancel, run };
}
