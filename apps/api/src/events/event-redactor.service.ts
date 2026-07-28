import { Injectable } from '@nestjs/common';
const SENSITIVE =
  /(?:password|secret|token|authorization|cookie|message(?:body|content)|private(?:message|content)|credential)/iu;
@Injectable()
export class EventRedactor {
  redact(value: unknown, depth = 0): unknown {
    if (depth > 8) return '[MAX_DEPTH]';
    if (Array.isArray(value))
      return value.slice(0, 100).map((item) => this.redact(item, depth + 1));
    if (value && typeof value === 'object' && !(value instanceof Date)) {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, item]) => [
          key,
          SENSITIVE.test(key) ? '[REDACTED]' : this.redact(item, depth + 1),
        ]),
      );
    }
    if (typeof value === 'string')
      return value.length > 10_000 ? `${value.slice(0, 10_000)}[TRUNCATED]` : value;
    return value;
  }
}
