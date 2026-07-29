import { describe, expect, it } from 'vitest';
import { createMongoOptions, resolveDatabaseName, type MongoConfiguration } from './mongo.options.js';

const base: MongoConfiguration = {
  uri: 'mongodb://localhost:27017',
  environment: 'test',
  databasePrefix: 'marketing',
  minPoolSize: 2,
  maxPoolSize: 12,
  maxConnecting: 3,
  maxIdleTimeMs: 60_000,
  waitQueueTimeoutMs: 2_000,
  serverSelectionTimeoutMs: 4_000,
  socketTimeoutMs: 30_000,
};

describe('Mongo connection configuration', () => {
  it('builds an environment-isolated, explicitly indexed connection', () => {
    const options = createMongoOptions(base);
    expect(options).toMatchObject({
      dbName: 'marketing_test',
      autoIndex: false,
      minPoolSize: 2,
      maxPoolSize: 12,
      maxConnecting: 3,
      maxIdleTimeMS: 60_000,
      waitQueueTimeoutMS: 2_000,
      serverSelectionTimeoutMS: 4_000,
      socketTimeoutMS: 30_000,
    });
  });

  it('honors an explicit database and rejects unsafe configuration', () => {
    expect(resolveDatabaseName({ ...base, database: 'isolated_database' })).toBe('isolated_database');
    expect(() => createMongoOptions({ ...base, uri: 'https://example.com' })).toThrow('MONGODB_URI');
    expect(() => createMongoOptions({ ...base, minPoolSize: 20, maxPoolSize: 5 })).toThrow(
      'cannot exceed',
    );
  });
});
