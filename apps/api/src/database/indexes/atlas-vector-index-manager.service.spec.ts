import { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';
import { MongoConnection } from '../mongo/mongo.connection.js';
import { AtlasVectorIndexManagerService } from './atlas-vector-index-manager.service.js';
import {
  atlasVectorIndex,
  VECTOR_FILTER_PATHS,
  vectorIndexName,
} from './vector-index-definitions.js';

describe('Atlas vector index management', () => {
  it('creates environment-specific, fully filterable definitions', () => {
    const definition = atlasVectorIndex('staging', 'V2', 3072);
    expect(definition.name).toBe(vectorIndexName('staging', 'V2'));
    expect(
      definition.definition.fields
        .filter((field) => field.type === 'filter')
        .map((field) => field.path),
    ).toEqual(VECTOR_FILTER_PATHS);
  });

  it('refuses activation until Atlas reports READY and queryable', async () => {
    const aggregate = vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue([{ name: 'index', status: 'BUILDING', queryable: false }]),
    });
    const native = {
      collection: vi.fn().mockReturnValue({ aggregate, updateMany: vi.fn(), updateOne: vi.fn() }),
    };
    const manager = new AtlasVectorIndexManagerService(
      { native } as unknown as MongoConnection,
      new ConfigService({ app: { environment: 'test' }, database: { uri: 'mongodb://test' } }),
    );
    await expect(manager.activate(atlasVectorIndex('test', 'v1', 1536))).rejects.toThrow(
      'not ready',
    );
  });

  it('records activation only after a ready health check', async () => {
    const updateMany = vi.fn(),
      updateOne = vi.fn();
    const native = {
      collection: vi.fn().mockReturnValue({
        aggregate: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([{ status: 'READY', queryable: true }]),
        }),
        updateMany,
        updateOne,
      }),
    };
    const manager = new AtlasVectorIndexManagerService(
      { native } as unknown as MongoConnection,
      new ConfigService({ app: { environment: 'test' }, database: { uri: 'mongodb://test' } }),
    );
    await expect(manager.activate(atlasVectorIndex('test', 'v1', 1536))).resolves.toBe(
      'knowledge-chunks-test-v1',
    );
    expect(updateMany).toHaveBeenCalled();
    expect(updateOne).toHaveBeenCalledWith(
      { name: 'knowledge-chunks-test-v1' },
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      expect.objectContaining({ $set: expect.objectContaining({ status: 'active' }) }),
      { upsert: false },
    );
  });
});
