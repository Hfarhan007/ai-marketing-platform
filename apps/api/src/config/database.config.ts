import { registerAs } from '@nestjs/config';

export const databaseConfig = registerAs('database', () => ({
  uri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/ai-marketing-platform',
  database: process.env.MONGODB_DATABASE,
  databasePrefix: process.env.MONGODB_DATABASE_PREFIX ?? 'ai_marketing',
  minPoolSize: Number(process.env.MONGODB_MIN_POOL_SIZE ?? 2),
  maxPoolSize: Number(process.env.MONGODB_MAX_POOL_SIZE ?? 20),
  serverSelectionTimeoutMs: Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS ?? 5_000),
  socketTimeoutMs: Number(process.env.MONGODB_SOCKET_TIMEOUT_MS ?? 45_000),
}));
