import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  environment: process.env.NODE_ENV ?? 'development',
  host: process.env.HOST ?? '0.0.0.0',
  port: Number(process.env.PORT ?? 3001),
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000,http://localhost:5173').split(',').map((origin) => origin.trim()).filter(Boolean),
  rateLimit: {
    ttl: Number(process.env.RATE_LIMIT_TTL_MS ?? 60_000),
    limit: Number(process.env.RATE_LIMIT_MAX ?? 100),
  },
  trustProxy: process.env.TRUST_PROXY ?? 'false',
  maxBodySizeBytes: Number(process.env.APP_MAX_BODY_SIZE_BYTES ?? 1_048_576),
}));
