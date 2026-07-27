export function unique<Value>(values: readonly Value[]) { return [...new Set(values)]; }
export function chunk<Value>(values: readonly Value[], size: number) {
  if (!Number.isInteger(size) || size < 1) throw new RangeError('Chunk size must be a positive integer.');
  return Array.from({ length: Math.ceil(values.length / size) }, (_, index) => values.slice(index * size, (index + 1) * size));
}
export function groupBy<Value, Key extends PropertyKey>(values: readonly Value[], keyOf: (value: Value) => Key) {
  return values.reduce<Partial<Record<Key, Value[]>>>((result, value) => {
    const key = keyOf(value);
    (result[key] ??= []).push(value);
    return result;
  }, {});
}
export function pick<ObjectType extends object, Key extends keyof ObjectType>(value: ObjectType, keys: readonly Key[]) {
  return keys.reduce<Pick<ObjectType, Key>>((result, key) => { result[key] = value[key]; return result; }, {} as Pick<ObjectType, Key>);
}
export function omit<ObjectType extends object, Key extends keyof ObjectType>(value: ObjectType, keys: readonly Key[]): Omit<ObjectType, Key> {
  const excluded = new Set<PropertyKey>(keys);
  return Object.fromEntries(Object.entries(value).filter(([key]) => !excluded.has(key))) as Omit<ObjectType, Key>;
}
export function compactObject(value: Readonly<Record<string, unknown>>) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== ''));
}
export function filterByQuery<Value>(values: readonly Value[], query: string, select: (value: Value) => readonly unknown[]) {
  const normalized = query.trim().toLocaleLowerCase();
  return normalized ? values.filter((value) => select(value).some((field) => {
    const searchable = typeof field === 'string' || typeof field === 'number' || typeof field === 'boolean' ? String(field) : '';
    return searchable.toLocaleLowerCase().includes(normalized);
  })) : [...values];
}
export function sortBy<Value>(values: readonly Value[], select: (value: Value) => string | number | Date | null | undefined, direction: 'asc' | 'desc' = 'asc') {
  const multiplier = direction === 'asc' ? 1 : -1;
  return [...values].sort((left, right) => {
    const a = select(left); const b = select(right);
    if (a == null) return 1; if (b == null) return -1;
    const leftValue = a instanceof Date ? a.getTime() : a;
    const rightValue = b instanceof Date ? b.getTime() : b;
    return typeof leftValue === 'string' && typeof rightValue === 'string'
      ? leftValue.localeCompare(rightValue) * multiplier
      : ((leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0) * multiplier);
  });
}
