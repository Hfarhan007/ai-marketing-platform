import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { updateSearchParams, type QueryValue } from '@/shared/utils/query-params';
export function useQueryParams() {
  const [params, setParams] = useSearchParams();
  const update = useCallback((values: Readonly<Record<string, QueryValue>>) => {
    setParams((current) => updateSearchParams(current, values), { replace: true });
  }, [setParams]);
  return { get: (key: string) => params.get(key), getAll: (key: string) => params.getAll(key), params, set: (key: string, value?: QueryValue) => update({ [key]: value }), update };
}
