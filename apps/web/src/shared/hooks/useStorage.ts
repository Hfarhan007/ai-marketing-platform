import { useCallback, useState } from 'react';
import { createStorage, type StorageCodec } from '@/shared/lib/storage';

function useBrowserStorage<Value>(storage: Storage, key: string, initialValue: Value, codec?: StorageCodec<Value>) {
  const adapter = createStorage(storage, key, codec ?? { parse: (value) => value as Value });
  const [value, setValueState] = useState(() => adapter.get() ?? initialValue);
  const setValue = useCallback((next: Value | ((current: Value) => Value)) => {
    setValueState((current) => { const resolved = typeof next === 'function' ? (next as (current: Value) => Value)(current) : next; adapter.set(resolved); return resolved; });
  }, [adapter]);
  const remove = useCallback(() => { adapter.remove(); setValueState(initialValue); }, [adapter, initialValue]);
  return [value, setValue, remove] as const;
}
export function useLocalStorage<Value>(key: string, initialValue: Value, codec?: StorageCodec<Value>) { return useBrowserStorage(localStorage, key, initialValue, codec); }
export function useSessionStorage<Value>(key: string, initialValue: Value, codec?: StorageCodec<Value>) { return useBrowserStorage(sessionStorage, key, initialValue, codec); }
