export interface StorageCodec<Value> {
  parse: (value: unknown) => Value;
  serialize?: (value: Value) => unknown;
}

export interface TypedStorage<Value> {
  get: () => Value | null;
  remove: () => void;
  set: (value: Value) => void;
}

export function createStorage<Value>(storage: Storage, key: string, codec: StorageCodec<Value>): TypedStorage<Value> {
  if (!key.trim()) throw new Error('Storage key is required.');
  return {
    get: () => {
      try {
        const raw = storage.getItem(key);
        if (raw === null) return null;
        return codec.parse(JSON.parse(raw) as unknown);
      } catch {
        storage.removeItem(key);
        return null;
      }
    },
    remove: () => storage.removeItem(key),
    set: (value) => storage.setItem(key, JSON.stringify(codec.serialize?.(value) ?? value)),
  };
}
