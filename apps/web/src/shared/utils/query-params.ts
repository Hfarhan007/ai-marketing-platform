export type QueryValue = boolean | number | string | null | undefined | readonly (boolean | number | string)[];

export function toSearchParams(values: Readonly<Record<string, QueryValue>>) {
  const params = new URLSearchParams();
  for (const [key, raw] of Object.entries(values)) {
    if (raw === undefined || raw === null || raw === '') continue;
    for (const value of Array.isArray(raw) ? raw : [raw]) params.append(key, String(value));
  }
  return params;
}
export function searchParamsToObject(params: URLSearchParams) {
  const result: Record<string, string | string[]> = {};
  for (const [key, value] of params) {
    const current = result[key];
    result[key] = current === undefined ? value : Array.isArray(current) ? [...current, value] : [current, value];
  }
  return result;
}
export function updateSearchParams(current: URLSearchParams, updates: Readonly<Record<string, QueryValue>>) {
  const next = new URLSearchParams(current);
  for (const [key, raw] of Object.entries(updates)) {
    next.delete(key);
    if (raw === undefined || raw === null || raw === '') continue;
    for (const value of Array.isArray(raw) ? raw : [raw]) next.append(key, String(value));
  }
  return next;
}
