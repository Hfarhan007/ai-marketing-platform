import { describe, expect, it, vi } from 'vitest';
import { CitationService } from '../citations/citation.service.js';
import { LanguageService } from '../document-processing/language.service.js';
import { RagRetrievalService } from './rag-retrieval.service.js';
import { RETRIEVAL_BENCHMARKS } from './fixtures/retrieval-benchmark.fixture.js';
import type { VectorHit } from '../vector-search/vector-search.types.js';
import { ContextAssemblyService } from '../context-assembly/context-assembly.service.js';

const hit = (
  id: string,
  score: number,
  sourceId = 'source',
  documentId = 'document',
  extra: Partial<VectorHit> = {},
): VectorHit => ({
  id,
  score,
  workspaceId: 'workspace',
  sourceId,
  documentId,
  collectionIds: [],
  language: 'en',
  status: 'active',
  text: `Useful content ${id}`,
  metadata: { contentHash: id },
  ...extra,
});

const setup = (keyword = [hit('keyword', 9)], vector = [hit('vector', 0.9)]) => {
  const ai = { embed: vi.fn().mockResolvedValue({ vectors: [[1, 0]] }) };
  const vectors = { search: vi.fn().mockResolvedValue(vector) };
  const repository = { keywordSearch: vi.fn().mockResolvedValue(keyword), logRetrieval: vi.fn() };
  const reranker = {
    maxCandidates: 20,
    rerank: vi.fn((request: { hits: VectorHit[] }) =>
      Promise.resolve({
        hits: request.hits,
        provider: 'test',
        model: 'test-v1',
        latencyMs: 2,
        costUsd: 0.001,
        inputCount: request.hits.length,
      }),
    ),
  };
  const security = {
    validate: vi.fn().mockReturnValue({ injection: { detected: false } }),
    checkQuery: vi.fn().mockReturnValue({ suspicious: false, reasons: [], risk: 'low' }),
  };
  const service = new RagRetrievalService(
    ai as never,
    vectors,
    reranker,
    new CitationService(),
    security as never,
    repository as never,
    new LanguageService(),
    new ContextAssemblyService(),
  );
  return { service, ai, vectors, repository, reranker };
};

describe('advanced hybrid retrieval benchmarks', () => {
  it.each(RETRIEVAL_BENCHMARKS)('$name', async ({ mode, expectKeyword, expectVector }) => {
    const context = setup();
    const result = await context.service.retrieve({
      workspaceId: 'workspace',
      userId: 'user',
      correlationId: mode,
      query: 'Product pricing information',
      policy: { mode },
      explain: true,
      administrator: true,
    });
    expect(context.repository.keywordSearch).toHaveBeenCalledTimes(expectKeyword ? 1 : 0);
    expect(context.vectors.search).toHaveBeenCalledTimes(expectVector ? 1 : 0);
    expect(result.hits.length).toBeGreaterThan(0);
    expect(result.stages).toHaveLength(14);
  });

  it('preserves raw scores through reciprocal-rank fusion', async () => {
    const sharedKeyword = hit('shared', 12),
      sharedVector = hit('shared', 0.92);
    const { service } = setup([sharedKeyword], [sharedVector]);
    const result = await service.retrieve({
      workspaceId: 'workspace',
      userId: 'user',
      correlationId: 'rrf',
      query: 'shared result',
      policy: { fusion: 'rrf' },
    });
    expect(result.hits[0]).toMatchObject({
      rawKeywordScore: 12,
      rawVectorScore: 0.92,
      retrievalRanks: { keyword: 1, vector: 1 },
    });
    expect(result.hits[0]?.fusedScore).toBeGreaterThan(0);
  });

  it('applies ACL and document/source diversity before returning context', async () => {
    const values = [
      hit('one', 1, 'source-a', 'document-a'),
      hit('two', 0.9, 'source-a', 'document-a'),
      hit('three', 0.8, 'source-a', 'document-b'),
      hit('restricted', 0.7, 'source-b', 'document-c', { accessControl: { groups: ['private'] } }),
      hit('diverse', 0.6, 'source-c', 'document-d'),
    ];
    const { service } = setup([], values);
    const result = await service.retrieve({
      workspaceId: 'workspace',
      userId: 'user',
      correlationId: 'acl',
      query: 'diverse context',
      filters: { accessControlGroups: ['public'] },
      policy: { mode: 'vector', perSourceLimit: 2, perDocumentLimit: 1 },
      limit: 10,
    });
    expect(result.hits.map((value) => value.id)).toEqual(['one', 'three', 'diverse']);
  });

  it('handles no-result and access-filtered cases explicitly', async () => {
    const restricted = hit('restricted', 1, 'source', 'document', {
      accessControl: { groups: ['private'] },
    });
    const { service } = setup([], [restricted]);
    await expect(
      service.retrieve({
        workspaceId: 'workspace',
        userId: 'user',
        correlationId: 'none',
        query: 'missing',
        filters: { accessControlGroups: ['public'] },
        policy: { mode: 'vector' },
      }),
    ).resolves.toMatchObject({ hits: [], noResults: true, reason: 'access_control_filtered' });
  });

  it('only exposes stage explanations to administrators', async () => {
    const { service } = setup();
    const result = await service.retrieve({
      workspaceId: 'workspace',
      userId: 'user',
      correlationId: 'explain',
      query: 'pricing',
      explain: true,
      administrator: false,
    });
    expect(result.stages).toBeUndefined();
  });

  it('bounds reranker input and falls back without bypassing ACL', async () => {
    const values = [
      hit('restricted', 2, 'restricted-source', 'restricted-document', {
        accessControl: { groups: ['private'] },
      }),
      ...Array.from({ length: 25 }, (_, index) =>
        hit(`public-${index}`, 1 - index / 100, `source-${index}`, `document-${index}`),
      ),
    ];
    const context = setup([], values);
    context.reranker.rerank.mockRejectedValueOnce(new Error('provider unavailable'));
    const result = await context.service.retrieve({
      workspaceId: 'workspace',
      userId: 'user',
      correlationId: 'fallback',
      query: 'safe result',
      filters: { accessControlGroups: ['public'] },
      policy: { mode: 'vector', candidateLimit: 40 },
      explain: true,
      administrator: true,
      limit: 20,
    });
    expect(context.reranker.rerank.mock.calls[0]?.[0].hits).toHaveLength(20);
    expect(result.hits.some((value) => value.id === 'restricted')).toBe(false);
    expect(result.stages?.find((value) => value.name === 'reranking')?.detail).toMatchObject({
      fallback: true,
      costUsd: 0,
    });
  });
});
