import type { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import { AuthCryptoService } from './auth-crypto.service.js';

describe('AuthCryptoService', () => {
  const service = new AuthCryptoService({
    getOrThrow: () => 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
  } as unknown as ConfigService);

  it('encrypts two-factor secrets with authenticated encryption', () => {
    const encrypted = service.encrypt('two-factor-secret');
    expect(encrypted).not.toContain('two-factor-secret');
    expect(service.decrypt(encrypted)).toBe('two-factor-secret');
  });

  it('creates stable hashes without storing raw tokens', () => {
    expect(service.hashToken('refresh-token')).toMatch(/^[a-f0-9]{64}$/u);
    expect(service.hashToken('refresh-token')).not.toBe('refresh-token');
  });
});
