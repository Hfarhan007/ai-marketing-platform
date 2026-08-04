import { describe, expect, it } from 'vitest';
import { CHUNKING_STRATEGIES, ChunkingService, type ChunkingStrategy } from './chunking.service.js';
import { STRATEGY_BENCHMARK_FIXTURES } from './fixtures/strategy-benchmark.fixture.js';

const input = (content: string, strategy: ChunkingStrategy) => ({
  content,
  strategy,
  document: {
    workspaceId: 'workspace',
    sourceId: 'source',
    documentId: 'document',
    revisionId: 'revision',
    language: 'en',
    accessControl: { roles: ['reader'] },
  },
});

const run = (service: ChunkingService, content: string, strategy: ChunkingStrategy, extra = {}) =>
  service.chunkDocument({
    ...input(content, strategy).document,
    content,
    policy: { strategy, targetTokens: 20, maxTokens: 40, overlapTokens: 5, ...extra },
  });

describe('configurable semantic chunking', () => {
  const service = new ChunkingService();

  it('supports every advertised strategy and records complete provenance', () => {
    for (const strategy of CHUNKING_STRATEGIES) {
      const [chunk] = run(service, 'First complete sentence. Second complete sentence.', strategy);
      expect(chunk).toMatchObject({
        workspaceId: 'workspace',
        sourceId: 'source',
        documentId: 'document',
        revisionId: 'revision',
        language: 'en',
        accessControl: { roles: ['reader'] },
        chunkingVersion: 'semantic-v2',
      });
      expect(chunk?.boundaryReason).toBeTruthy();
      expect(chunk?.tokenCount).toBeGreaterThan(0);
      expect(chunk?.contentHash).toHaveLength(64);
    }
  });

  it('keeps markdown tables logically intact', () => {
    const table = '| Name | Value |\n| --- | --- |\n| One | A |\n| Two | B |';
    expect(
      run(service, `# Data\n${table}\nAfter the table.`, 'table-aware').some(
        (chunk) => chunk.text === table,
      ),
    ).toBe(true);
  });

  it('preserves headings and section hierarchy', () => {
    const chunks = run(
      service,
      '# Product\nIntro text.\n## Limits\nLimit details.',
      'heading-aware',
    );
    expect(chunks.find((chunk) => chunk.text.includes('Limit details'))).toMatchObject({
      heading: 'Limits',
      sectionHierarchy: ['Product', 'Limits'],
    });
  });

  it('handles multilingual sentence boundaries and metadata', () => {
    const chunks = service.chunkDocument({
      ...input('Hello world. مرحبا بالعالم۔ 你好世界。', 'sentence-aware').document,
      language: 'ar',
      content: 'Hello world. مرحبا بالعالم۔ 你好世界。',
      policy: { strategy: 'sentence-aware', targetTokens: 20, maxTokens: 30, overlapTokens: 0 },
    });
    expect(chunks.map((chunk) => chunk.text).join(' ')).toContain('你好世界。');
    expect(chunks.every((chunk) => chunk.language === 'ar')).toBe(true);
  });

  it('removes repeated page headers and footers and flags near duplicates', () => {
    const pages =
      'Company confidential\nAlpha unique body.\nPage footer\n\f\nCompany confidential\nAlpha unique body with addition.\nPage footer';
    const chunks = run(service, pages, 'paragraph', { nearDuplicateThreshold: 0.5 });
    expect(chunks.some((chunk) => chunk.text.includes('Company confidential'))).toBe(false);
    const duplicates = run(
      service,
      'Shared campaign guidance for all teams.\n\nShared campaign guidance for all teams with one addition.',
      'paragraph',
      { nearDuplicateThreshold: 0.5 },
    );
    expect(duplicates.some((chunk) => chunk.nearDuplicateOf !== null)).toBe(true);
  });

  it('keeps FAQ answers with questions and can add parent and summary chunks', () => {
    const chunks = run(
      service,
      '# Help\nQ: Can I export?\nA: Yes, choose Export.\n\nQ: Is it secure?\nA: Yes.',
      'faq-pair',
      { createParentChunks: true, createSummaryChunks: true },
    );
    expect(chunks.find((chunk) => chunk.text.startsWith('Q: Can I export?'))?.text).toContain(
      'A: Yes',
    );
    expect(chunks.some((chunk) => chunk.chunkType === 'parent')).toBe(true);
    expect(chunks.some((chunk) => chunk.chunkType === 'summary')).toBe(true);
  });

  it.each(STRATEGY_BENCHMARK_FIXTURES)('runs benchmark fixture: $name', (fixture) => {
    const comparison = fixture.strategies.map((strategy) => ({
      strategy,
      chunks: run(service, fixture.content, strategy).length,
    }));
    expect(comparison).toHaveLength(fixture.strategies.length);
    expect(comparison.every((result) => result.chunks > 0)).toBe(true);
  });
});
