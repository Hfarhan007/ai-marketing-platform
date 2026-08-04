import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';
import { describe, expect, it, vi } from 'vitest';
import {
  AtlasVectorSearchAdapter,
  assertWorkspaceVectorFilter,
} from './atlas-vector-search.adapter.js';

const workspaceId = new Types.ObjectId().toHexString();

describe('Atlas vector tenant enforcement', () => {
  it('fails when a workspace filter is omitted or does not match trusted context', () => {
    expect(() => assertWorkspaceVectorFilter({}, workspaceId)).toThrow('Unfiltered');
    expect(() =>
      assertWorkspaceVectorFilter({ workspaceId: new Types.ObjectId() }, workspaceId),
    ).toThrow('mismatched');
  });

  it('always places workspaceId in the $vectorSearch filter', () => {
    const adapter = new AtlasVectorSearchAdapter(
      {} as never,
      new ConfigService({ app: { environment: 'test' }, database: { vectorIndexVersion: 'v1' } }),
    );
    const pipeline = adapter.buildPipeline(
      'index',
      workspaceId,
      [1, 0],
      { accessControlGroups: ['group-a'], contentType: 'article' },
      5,
    );
    expect(
      (pipeline[0] as { $vectorSearch: { filter: Record<string, unknown> } }).$vectorSearch.filter,
    ).toMatchObject({
      workspaceId: new Types.ObjectId(workspaceId),
      'accessControl.groups': { $in: ['group-a'] },
      'metadata.contentType': 'article',
    });
    expect(() => adapter.buildPipeline('index', '', [1, 0], {}, 5)).toThrow();
  });

  it('dual-reads active and candidate indexes with tenant filters', async () => {
    const pipelines: unknown[] = [];
    const model = {
      aggregate: vi.fn((pipeline: unknown) => {
        pipelines.push(pipeline);
        return { exec: vi.fn().mockResolvedValue([]) };
      }),
    };
    const config = new ConfigService({
      app: { environment: 'test' },
      database: { vectorIndexVersion: 'v1', vectorCandidateVersion: 'v2', vectorDualRead: true },
    });
    await new AtlasVectorSearchAdapter(model as never, config).search(workspaceId, [1, 0], {}, 5);
    expect(pipelines).toHaveLength(2);
    for (const pipeline of pipelines) {
      const filter = (pipeline as Array<{ $vectorSearch: { filter: Record<string, unknown> } }>)[0]!
        .$vectorSearch.filter;
      expect(String(filter.workspaceId)).toBe(workspaceId);
    }
  });
});
