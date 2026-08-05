const SENSITIVE_KEY = /(authorization|cookie|password|passwd|secret|token|api[-_]?key|credential|private[-_]?key|session)/i;
const SECRET_VALUE = /\b(Bearer\s+\S+|sk-[A-Za-z0-9_-]{16,}|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)\b/gi;
export const REDACTED = '[REDACTED]';

export function redactSensitive<T>(value: T, seen = new WeakSet<object>()): T {
  if (typeof value === 'string') return value.replace(SECRET_VALUE, REDACTED) as T;
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return '[CIRCULAR]' as T;
  seen.add(value);
  if (Array.isArray(value)) {
    const items: unknown[] = value.map((item: unknown) => redactSensitive(item, seen));
    return items as T;
  }
  const output: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) output[key] = SENSITIVE_KEY.test(key) ? REDACTED : redactSensitive(item, seen);
  return output as T;
}
