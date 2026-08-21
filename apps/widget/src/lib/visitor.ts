const KEY = 'amp_widget_visitor';
let volatileId: string | undefined;
export function anonymousVisitorId(storage: Pick<Storage, 'getItem' | 'setItem'> | undefined = globalThis.localStorage) {
  try {
    const existing = storage?.getItem(KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    storage?.setItem(KEY, id);
    return id;
  } catch {
    return volatileId ??= crypto.randomUUID();
  }
}
