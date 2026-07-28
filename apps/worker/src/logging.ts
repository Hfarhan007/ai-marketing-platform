import pino from 'pino';
import type { WorkerConfig } from './config.js';
export function createLogger(config: WorkerConfig) {
  return pino({
    level: config.LOG_LEVEL,
    base: { service: 'ai-marketing-worker', environment: config.NODE_ENV },
    redact: {
      paths: [
        'password',
        'token',
        'accessToken',
        'refreshToken',
        'authorization',
        'payload.content',
        'job.data.content',
      ],
      censor: '[REDACTED]',
    },
  });
}
export type Logger = ReturnType<typeof createLogger>;
