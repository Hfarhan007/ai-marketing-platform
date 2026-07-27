import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';
import { describe, expect, it, vi } from 'vitest';
import type { MembershipsRepository } from '../../memberships/repositories/memberships.repository.js';
import type { UsersRepository } from '../../users/repositories/users.repository.js';
import { UserStatus } from '../../users/schemas/user.schema.js';
import type { AuthRepository } from '../repositories/auth.repository.js';
import type { AccessTokenService } from './access-token.service.js';
import type { AuthCryptoService } from './auth-crypto.service.js';
import type { AuthNotificationService } from './auth-notification.service.js';
import { AuthService } from './auth.service.js';
import type { PasswordService } from './password.service.js';

function service(authOverrides: Partial<AuthRepository>) {
  const auth = {
    consumeRefreshToken: vi.fn(),
    findRefreshToken: vi.fn(),
    revokeFamily: vi.fn().mockResolvedValue(undefined),
    recordAudit: vi.fn().mockResolvedValue(undefined),
    createRefreshToken: vi.fn().mockResolvedValue(undefined),
    findActiveSession: vi.fn(),
    ...authOverrides,
  };
  const users = { findById: vi.fn() };
  const crypto = {
    hashToken: vi.fn((value: string) => `hash:${value}`),
    randomToken: vi.fn().mockReturnValue('rotated-token'),
  };
  const instance = new AuthService(
    {
      getOrThrow: (key: string) => {
        const values: Record<string, unknown> = {
          'auth.refreshTokenTtlSeconds': 3600,
          'auth.lockoutAttempts': 5,
          'auth.lockoutSeconds': 900,
          'auth.resetRevokesAllSessions': true,
        };
        return values[key];
      },
    } as unknown as ConfigService,
    users as unknown as UsersRepository,
    auth as unknown as AuthRepository,
    {} as MembershipsRepository,
    {} as PasswordService,
    crypto as unknown as AuthCryptoService,
    { sign: vi.fn().mockReturnValue('access-token') } as unknown as AccessTokenService,
    {} as AuthNotificationService,
  );
  return { instance, auth, users };
}

describe('AuthService refresh rotation', () => {
  it('revokes a token family when a consumed refresh token is reused', async () => {
    const record = {
      userId: new Types.ObjectId(),
      familyId: 'family',
    };
    const { instance, auth } = service({
      consumeRefreshToken: vi.fn().mockResolvedValue(null),
      findRefreshToken: vi.fn().mockResolvedValue(record),
    });
    await expect(
      instance.refresh('old-token', { ip: '127.0.0.1', userAgent: 'test' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(auth.revokeFamily).toHaveBeenCalledWith('family', 'refresh_token_reuse');
  });

  it('stores only the replacement hash during rotation', async () => {
    const userId = new Types.ObjectId();
    const sessionId = new Types.ObjectId();
    const consumed = { userId, sessionId, familyId: 'family' };
    const { instance, auth, users } = service({
      consumeRefreshToken: vi.fn().mockResolvedValue(consumed),
      findActiveSession: vi.fn().mockResolvedValue({ _id: sessionId }),
    });
    users.findById.mockResolvedValue({
      _id: userId,
      platformAdmin: false,
      passwordChangedAt: new Date(),
      status: UserStatus.Active,
    });
    await expect(
      instance.refresh('old-token', { ip: '127.0.0.1', userAgent: 'test' }),
    ).resolves.toMatchObject({ refreshToken: 'rotated-token' });
    expect(auth.createRefreshToken).toHaveBeenCalledWith(
      expect.objectContaining({ tokenHash: 'hash:rotated-token', parentTokenHash: 'hash:old-token' }),
    );
  });
});
