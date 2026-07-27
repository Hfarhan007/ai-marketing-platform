import { registerAs } from '@nestjs/config';

export const authConfig = registerAs('auth', () => ({
  issuer: process.env.AUTH_ISSUER ?? 'ai-marketing-platform',
  accessTokenSecret:
    process.env.AUTH_ACCESS_TOKEN_SECRET ?? 'development-access-token-secret-change-me',
  encryptionKey:
    process.env.AUTH_ENCRYPTION_KEY ?? 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
  accessTokenTtlSeconds: Number(process.env.AUTH_ACCESS_TOKEN_TTL_SECONDS ?? 900),
  refreshTokenTtlSeconds: Number(process.env.AUTH_REFRESH_TOKEN_TTL_SECONDS ?? 2_592_000),
  lockoutAttempts: Number(process.env.AUTH_LOCKOUT_ATTEMPTS ?? 5),
  lockoutSeconds: Number(process.env.AUTH_LOCKOUT_SECONDS ?? 900),
  cookieSecure: process.env.AUTH_COOKIE_SECURE === 'true',
  resetRevokesAllSessions: process.env.AUTH_RESET_REVOKES_ALL_SESSIONS !== 'false',
}));
