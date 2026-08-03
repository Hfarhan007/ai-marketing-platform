import { createHash } from 'node:crypto';
import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import type { AgentToolDefinition } from './agent-tool.types.js';

const forbiddenKeys = /^(?:sql|query_text|database_query|shell|command|cmd|code|script|eval|url|uri)$/iu;
const url = /\b(?:https?|file|ftp):\/\/[^\s]+/giu;

export function stableValue(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableValue).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => `${JSON.stringify(key)}:${stableValue(child)}`).join(',')}}`;
  return JSON.stringify(value);
}
export function generatedIdempotencyKey(workspaceId: string, runId: string, tool: AgentToolDefinition, args: unknown) {
  return createHash('sha256').update(`${workspaceId}:${runId}:${tool.name}:${tool.version}:${stableValue(args)}`).digest('hex');
}
export function assertSafeArguments(value: unknown, allowedOrigins: readonly string[] = [], path = '$'): void {
  if (Array.isArray(value)) return value.forEach((child, index) => assertSafeArguments(child, allowedOrigins, `${path}[${index}]`));
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (forbiddenKeys.test(key)) throw new BadRequestException(`Unsafe tool argument at ${path}.${key}`);
      assertSafeArguments(child, allowedOrigins, `${path}.${key}`);
    }
  }
  if (typeof value === 'string') for (const match of value.matchAll(url)) {
    let parsed: URL;
    try { parsed = new URL(match[0]); } catch { throw new BadRequestException(`Invalid URL at ${path}`); }
    if (!allowedOrigins.includes(parsed.origin)) throw new BadRequestException(`URL origin is not allowlisted at ${path}`);
  }
}
export function redact(value: unknown, keys: readonly string[]): unknown {
  const sensitive = new Set([...keys, 'password', 'token', 'secret', 'authorization', 'apiKey'].map((key) => key.toLowerCase()));
  if (Array.isArray(value)) return value.map((child) => redact(child, keys));
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, child]) => [key, sensitive.has(key.toLowerCase()) ? '[REDACTED]' : redact(child, keys)]));
}

export class ToolRateLimiter {
  private readonly buckets = new Map<string, number[]>();
  consume(key: string, policy: { limit: number; windowMs: number }, now = Date.now()) {
    const active = (this.buckets.get(key) ?? []).filter((time) => time > now - policy.windowMs);
    if (active.length >= policy.limit) throw new HttpException('Tool rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
    active.push(now); this.buckets.set(key, active);
  }
}
