import { describe, expect, it } from 'vitest';
import { anonymousVisitorId } from './visitor';
describe('anonymous visitor identity', () => { it('reuses the persisted pseudonymous identifier', () => { const values = new Map<string, string>(), storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => void values.set(key, value) }; expect(anonymousVisitorId(storage)).toBe(anonymousVisitorId(storage)); }); });
