import type { MongooseModuleOptions } from '@nestjs/mongoose';

export interface MongoConfiguration {
  uri: string;
  environment: string;
  database?: string;
  databasePrefix: string;
  minPoolSize: number;
  maxPoolSize: number;
  maxConnecting: number;
  maxIdleTimeMs: number;
  waitQueueTimeoutMs: number;
  serverSelectionTimeoutMs: number;
  socketTimeoutMs: number;
}

export function resolveDatabaseName(config: MongoConfiguration): string {
  if (config.database) return config.database;
  const environment = config.environment.replace(/[^a-zA-Z0-9_-]/gu, '_');
  return `${config.databasePrefix}_${environment}`;
}

export function createMongoOptions(config: MongoConfiguration): MongooseModuleOptions {
  if (!/^mongodb(?:\+srv)?:\/\/.+/u.test(config.uri)) {
    throw new Error('MONGODB_URI must use the mongodb:// or mongodb+srv:// scheme');
  }
  if (config.minPoolSize > config.maxPoolSize) {
    throw new Error('MONGODB_MIN_POOL_SIZE cannot exceed MONGODB_MAX_POOL_SIZE');
  }
  return {
    uri: config.uri,
    dbName: resolveDatabaseName(config),
    minPoolSize: config.minPoolSize,
    maxPoolSize: config.maxPoolSize,
    maxConnecting: config.maxConnecting,
    maxIdleTimeMS: config.maxIdleTimeMs,
    waitQueueTimeoutMS: config.waitQueueTimeoutMs,
    serverSelectionTimeoutMS: config.serverSelectionTimeoutMs,
    socketTimeoutMS: config.socketTimeoutMs,
    connectTimeoutMS: 10_000,
    heartbeatFrequencyMS: 10_000,
    compressors: ['zstd', 'snappy', 'zlib'],
    retryAttempts: 3,
    retryDelay: 1_000,
    autoIndex: false,
    autoCreate: config.environment !== 'production',
  };
}
