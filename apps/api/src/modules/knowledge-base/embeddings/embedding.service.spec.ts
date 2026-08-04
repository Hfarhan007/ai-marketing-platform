/* eslint-disable @typescript-eslint/require-await */
import { Types } from 'mongoose';
import { describe, expect, it, vi } from 'vitest';
import { EmbeddingService } from './embedding.service.js';

const chunk = (text: string, hash = text) => ({
  _id: new Types.ObjectId(),
  documentId: new Types.ObjectId(),
  text,
  textHash: hash,
});
const gateway = (dimension = 3) => ({
  embed: vi.fn(
    async ({ inputs, preferredModel }: { inputs: string[]; preferredModel?: string }) => ({
      vectors: inputs.map((text) =>
        Array.from({ length: dimension }, (_, index) => text.length + index),
      ),
      usage: { inputTokens: inputs.length * 2, outputTokens: 0 },
      costUsd: inputs.length * 0.001,
      provider: 'openai',
      model: preferredModel ?? 'old-model',
    }),
  ),
});

const repository = (chunks: ReturnType<typeof chunk>[] = []) => {
  const records: Array<Record<string, unknown>> = [];
  const jobs = new Map<string, Record<string, unknown>>();
  return {
    records,
    reusable: vi.fn(async (_workspace: string, id: string, version: string, hash: string) =>
      records.find(
        (record) =>
          String(record.chunkId) === id &&
          record.embeddingVersion === version &&
          record.contentHash === hash,
      ),
    ),
    markStale: vi.fn(),
    assertIndexDimension: vi.fn(async (_workspace: string, index: string, dimension: number) => {
      const existing = records.find((record) => record.indexName === index);
      if (existing && existing.vectorDimension !== dimension)
        throw new Error('incompatible dimension');
    }),
    save: vi.fn(async (value: Record<string, unknown>) => {
      records.push(value);
      return value;
    }),
    chunksForJob: vi.fn(async () => chunks),
    createJob: vi.fn(async (value: Record<string, unknown>) => {
      const job = { _id: new Types.ObjectId(), ...value };
      jobs.set(String(job._id), job);
      return job;
    }),
    job: vi.fn(async (_workspace: string, id: string) => jobs.get(id)),
    updateJob: vi.fn(
      async (_workspace: string, id: string, update: { $set: Record<string, unknown> }) =>
        Object.assign(jobs.get(id)!, update.$set),
    ),
    cancelJob: vi.fn(),
    activateMigration: vi.fn(async (_workspace: string, version: string) => {
      for (const record of records)
        record.status = record.embeddingVersion === version ? 'active' : 'stale';
    }),
  };
};

describe('embedding lifecycle', () => {
  it('batches requests at provider limits and produces deterministic accounting', async () => {
    const ai = gateway(),
      service = new EmbeddingService(ai as never);
    const result = await service.create({
      workspaceId: 'w',
      userId: 'u',
      correlationId: 'c',
      texts: Array.from({ length: 130 }, (_, index) => `text-${index}`),
      target: { provider: 'openai', model: 'new-model' },
    });
    expect(ai.embed).toHaveBeenCalledTimes(2);
    expect(result.vectors).toHaveLength(130);
    expect(result.usage.inputTokens).toBe(260);
    expect(result.costUsd).toBeCloseTo(0.13);
  });

  it('retries only vectors omitted by a partially successful provider response', async () => {
    const ai = gateway();
    ai.embed.mockImplementationOnce(async ({ inputs }) => ({
      vectors: [[1, 2, 3]],
      usage: { inputTokens: inputs.length, outputTokens: 0 },
      costUsd: 0.01,
      provider: 'openai',
      model: 'm',
    }));
    const result = await new EmbeddingService(ai as never).create({
      workspaceId: 'w',
      userId: 'u',
      correlationId: 'c',
      texts: ['one', 'two'],
      target: { provider: 'openai' },
    });
    expect(ai.embed).toHaveBeenCalledTimes(2);
    expect(ai.embed.mock.calls[1]?.[0].inputs).toEqual(['two']);
    expect(result.vectors).toHaveLength(2);
  });

  it('migrates models using a dual-index transition, then marks the old version stale', async () => {
    const chunks = [chunk('alpha', 'h1'), chunk('beta', 'h2')],
      repo = repository(chunks),
      ai = gateway(4);
    repo.records.push({
      chunkId: chunks[0]!._id,
      embeddingVersion: 'v1',
      contentHash: 'h1',
      vectorDimension: 3,
      indexName: 'old-index',
      status: 'active',
    });
    const service = new EmbeddingService(ai as never, repo as never);
    const migration = await service.startMigration({
      workspaceId: new Types.ObjectId().toHexString(),
      userId: 'u',
      provider: 'openai',
      model: 'new-model',
      version: 'v2',
      targetIndex: 'new-index',
      sourceVersion: 'v1',
      expectedDimension: 4,
    });
    expect(migration.embedded).toBe(2);
    expect(
      repo.records
        .filter((record) => record.embeddingVersion === 'v2')
        .every((record) => record.status === 'transition'),
    ).toBe(true);
    expect(repo.records.find((record) => record.embeddingVersion === 'v1')?.status).toBe('active');
    await service.activateMigration(new Types.ObjectId().toHexString(), 'v2');
    expect(repo.records.find((record) => record.embeddingVersion === 'v1')?.status).toBe('stale');
    expect(
      repo.records
        .filter((record) => record.embeddingVersion === 'v2')
        .every((record) => record.status === 'active'),
    ).toBe(true);
  });

  it('reuses unchanged embeddings and rejects a model with the wrong dimension', async () => {
    const one = chunk('same', 'same-hash'),
      repo = repository(),
      ai = gateway(4),
      service = new EmbeddingService(ai as never, repo as never);
    repo.records.push({
      chunkId: one._id,
      embeddingVersion: 'v2',
      contentHash: 'same-hash',
      vectorDimension: 4,
      indexName: 'new-index',
      status: 'active',
    });
    const reused = await service.embedChunks({
      workspaceId: new Types.ObjectId().toHexString(),
      userId: 'u',
      correlationId: 'c',
      chunks: [one],
      target: { provider: 'openai', version: 'v2', indexName: 'new-index' },
    });
    expect(reused.reused).toBe(1);
    expect(ai.embed).not.toHaveBeenCalled();
    await expect(
      service.embedChunks({
        workspaceId: new Types.ObjectId().toHexString(),
        userId: 'u',
        correlationId: 'c2',
        chunks: [chunk('new')],
        target: { provider: 'openai', version: 'v3', indexName: 'other', expectedDimension: 3 },
      }),
    ).rejects.toThrow('Expected 3-dimension');
  });
});
