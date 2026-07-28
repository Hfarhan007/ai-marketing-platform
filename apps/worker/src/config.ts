import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  WORKER_PORT: z.coerce.number().int().min(1).max(65535).default(3002),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  MONGODB_URI: z.string().min(1).default('mongodb://localhost:27017/ai-marketing-platform'),
  WORKER_PREFIX: z.string().min(1).default('amp'),
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(100).default(5),
  WORKER_WORKSPACE_CONCURRENCY: z.coerce.number().int().min(1).max(50).default(2),
  WORKER_JOB_TIMEOUT_MS: z.coerce.number().int().min(1000).default(120_000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});
export type WorkerConfig = z.infer<typeof schema>;
export function loadConfig(environment: NodeJS.ProcessEnv = process.env): WorkerConfig {
  return schema.parse(environment);
}
