import 'reflect-metadata';
import cookie from '@fastify/cookie';
import {
  Injectable,
  Module,
  UnauthorizedException,
  ValidationPipe,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { API_PREFIX } from '../src/common/constants/application.constants.js';
import type { RequestWithWorkspaceContext } from '../src/common/types/workspace-context.js';
import { AuthController } from '../src/modules/auth/controllers/auth.controller.js';
import { AuthService, type IssuedAuthTokens } from '../src/modules/auth/services/auth.service.js';

const userId = '507f1f77bcf86cd799439011';
const sessionId = '507f1f77bcf86cd799439012';
const tokens: IssuedAuthTokens = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  csrfToken: 'csrf-token',
  sessionId,
};

const auth = {
  register: vi.fn(),
  login: vi.fn(),
  refresh: vi.fn(),
  logout: vi.fn(),
  verifyEmail: vi.fn(),
  forgotPassword: vi.fn(),
  resetPassword: vi.fn(),
  changePassword: vi.fn(),
  setupTwoFactor: vi.fn(),
  confirmTwoFactor: vi.fn(),
  listSessions: vi.fn(),
  revokeSession: vi.fn(),
  acceptInvite: vi.fn(),
};

@Injectable()
class TestPrincipalGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithWorkspaceContext>();
    request.principal = { userId, sessionId, platformAdmin: false };
    return true;
  }
}

@Module({
  controllers: [AuthController],
  providers: [
    { provide: AuthService, useValue: auth },
    {
      provide: ConfigService,
      useValue: {
        getOrThrow: (key: string) =>
          key === 'auth.cookieSecure' ? false : key === 'auth.refreshTokenTtlSeconds' ? 3600 : undefined,
      },
    },
    { provide: APP_GUARD, useClass: TestPrincipalGuard },
  ],
})
class TestAuthModule {}

describe('authentication flows (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await NestFactory.create<NestFastifyApplication>(
      TestAuthModule,
      new FastifyAdapter(),
      { logger: false },
    );
    await app.register(cookie);
    app.setGlobalPrefix(API_PREFIX);
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    auth.register.mockResolvedValue(undefined);
    auth.login.mockResolvedValue(tokens);
    auth.refresh.mockResolvedValue(tokens);
    auth.logout.mockResolvedValue(undefined);
    auth.verifyEmail.mockResolvedValue(undefined);
    auth.forgotPassword.mockResolvedValue(undefined);
    auth.resetPassword.mockResolvedValue(undefined);
    auth.setupTwoFactor.mockResolvedValue({ secret: 'secret', recoveryCodes: ['recovery'] });
    auth.confirmTwoFactor.mockResolvedValue(undefined);
    auth.revokeSession.mockResolvedValue(true);
  });

  afterAll(async () => app.close());

  it('registers an account', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'person@example.com', displayName: 'Person', password: 'Strong-Password-42!' },
    });
    expect(response.statusCode).toBe(201);
    expect(auth.register).toHaveBeenCalledOnce();
  });

  it('logs in and sets server-managed cookies', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'person@example.com', password: 'Strong-Password-42!' },
    });
    expect(response.statusCode).toBe(200);
    const cookies = String(response.headers['set-cookie']);
    expect(cookies).toContain('amp_access=');
    expect(cookies).toContain('HttpOnly');
  });

  it('rotates a refresh token', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      headers: { cookie: 'amp_refresh=refresh-token; amp_csrf=csrf-token', 'x-csrf-token': 'csrf-token' },
    });
    expect(response.statusCode).toBe(200);
    expect(auth.refresh).toHaveBeenCalledWith('refresh-token', expect.any(Object));
  });

  it('rejects refresh-token reuse', async () => {
    auth.refresh.mockRejectedValueOnce(new UnauthorizedException('Invalid refresh token'));
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      headers: { cookie: 'amp_refresh=used-token; amp_csrf=csrf-token', 'x-csrf-token': 'csrf-token' },
    });
    expect(response.statusCode).toBe(401);
  });

  it('logs out and clears cookies', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/v1/auth/logout' });
    expect(response.statusCode).toBe(204);
    expect(String(response.headers['set-cookie'])).toContain('Max-Age=0');
  });

  it('returns an indistinguishable forgot-password response', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/password/forgot',
      payload: { email: 'unknown@example.com' },
    });
    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      message: 'If the account exists, password reset instructions will be sent.',
    });
  });

  it('resets a password', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/password/reset',
      payload: { token: 'x'.repeat(32), password: 'New-Strong-Password-42!' },
    });
    expect(response.statusCode).toBe(201);
    expect(auth.resetPassword).toHaveBeenCalledOnce();
  });

  it('verifies an email address', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/email/verify',
      payload: { token: 'x'.repeat(32) },
    });
    expect(response.statusCode).toBe(201);
    expect(auth.verifyEmail).toHaveBeenCalledOnce();
  });

  it('sets up and confirms two-factor authentication', async () => {
    const setup = await app.inject({ method: 'POST', url: '/api/v1/auth/2fa/setup' });
    const confirm = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/2fa/confirm',
      payload: { code: '123456' },
    });
    expect(setup.statusCode).toBe(201);
    expect(confirm.statusCode).toBe(201);
    expect(auth.confirmTwoFactor).toHaveBeenCalledWith(userId, '123456');
  });

  it('revokes a session owned by the authenticated user', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/auth/sessions/${sessionId}`,
    });
    expect(response.statusCode).toBe(200);
    expect(auth.revokeSession).toHaveBeenCalledWith(userId, sessionId);
  });
});
