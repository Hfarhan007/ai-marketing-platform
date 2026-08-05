import { describe, expect, it, vi } from 'vitest';
import type { VectorHit } from '../vector-search/vector-search.types.js';
import { GroundedAnswerService } from './grounded-answer.service.js';

const evidence = (extra: Partial<VectorHit> = {}): VectorHit => ({
  id: 'chunk-1',
  workspaceId: 'workspace',
  sourceId: 'source-1',
  documentId: 'document-1',
  collectionIds: [],
  language: 'en',
  status: 'active',
  score: 0.9,
  text: 'The Pro plan costs twenty dollars per month.',
  metadata: { title: 'Pricing Guide', pageNumber: 4, sectionHierarchy: ['Plans', 'Pro'] },
  ...extra,
});
const generated = (overrides: Record<string, unknown> = {}) => ({
  answer: 'The Pro plan costs twenty dollars per month [1].',
  classification: 'grounded_answer',
  claims: [
    {
      text: 'The Pro plan costs twenty dollars per month.',
      evidenceType: 'direct',
      citedChunkIds: ['chunk-1'],
      confidence: 0.95,
    },
  ],
  ...overrides,
});
const setup = (hits = [evidence()], structured = generated()) => {
  const retrieval = {
    retrieve: vi.fn().mockResolvedValue({
      hits,
      noResults: hits.length === 0,
      retrievalTraceId: 'trace-1',
      context: { applicationInstruction: 'Evidence only.' },
    }),
  };
  const ai = { execute: vi.fn().mockResolvedValue({ structured }) };
  const repository = { routeAnswerReview: vi.fn().mockResolvedValue({ _id: 'review-1' }) };
  const security = { redactOutput: vi.fn((value: string) => value) };
  return {
    service: new GroundedAnswerService(
      retrieval as never,
      ai as never,
      repository as never,
      security as never,
    ),
    retrieval,
    ai,
    repository,
  };
};
const input = {
  workspaceId: 'workspace',
  userId: 'user',
  correlationId: 'correlation',
  query: 'What does Pro cost?',
};

describe('GroundedAnswerService', () => {
  it('returns verified citations, evidence types and references', async () => {
    const result = await setup().service.answer(input);
    expect(result).toMatchObject({
      answerClassification: 'grounded_answer',
      citedChunkIds: ['chunk-1'],
      sourceTitles: ['Pricing Guide'],
      sourceCitations: [{ sourceId: 'source-1', chunkId: 'chunk-1', pageNumber: 4 }],
      retrievalTraceId: 'trace-1',
      confidence: { groundedness: 1, level: 'high' },
    });
    expect(result.claims[0]).toMatchObject({ evidenceType: 'direct', evidenceMatch: 1 });
  });

  it('rejects invented citations that were not retrieved', async () => {
    const context = setup(
      [evidence()],
      generated({
        claims: [
          {
            text: 'Invented fact.',
            evidenceType: 'direct',
            citedChunkIds: ['invented-chunk'],
            confidence: 0.9,
          },
        ],
      }),
    );
    await expect(context.service.answer(input)).rejects.toThrow('was not retrieved');
  });

  it('does not generate when evidence or required source metadata is missing', async () => {
    const noHits = setup([]);
    await expect(noHits.service.answer(input)).resolves.toMatchObject({
      answerClassification: 'insufficient_information',
      citedChunkIds: [],
    });
    expect(noHits.ai.execute).not.toHaveBeenCalled();
    const noTitle = setup([evidence({ metadata: {} })]);
    const result = await noTitle.service.answer(input);
    expect(result.answerClassification).toBe('insufficient_information');
    expect(result.unsupportedClaimWarnings[0]).toContain('source title');
    expect(noTitle.ai.execute).not.toHaveBeenCalled();
  });

  it('does not force an answer when retrieval quality is low', async () => {
    const context = setup([evidence({ score: 0.001 })]);
    const result = await context.service.answer(input);
    expect(result.answerClassification).toBe('insufficient_information');
    expect(context.ai.execute).not.toHaveBeenCalled();
  });

  it('routes configured low-groundedness answers for human review', async () => {
    const value = generated({
      claims: [
        {
          text: 'The Pro plan costs twenty dollars per month.',
          evidenceType: 'direct',
          citedChunkIds: ['chunk-1'],
          confidence: 0.9,
        },
        {
          text: 'It is the best plan.',
          evidenceType: 'direct',
          citedChunkIds: [],
          confidence: 0.4,
        },
      ],
    });
    const context = setup([evidence()], value);
    const result = await context.service.answer({
      ...input,
      answerPolicy: { minimumGroundedness: 0.4, humanReviewBelow: 0.8, routeHumanReview: true },
    });
    expect(result.answerClassification).toBe('requires_human_review');
    expect(result.humanReview).toMatchObject({
      required: true,
      routed: true,
      reviewId: 'review-1',
    });
    expect(context.repository.routeAnswerReview).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: 'workspace', retrievalTraceId: 'trace-1' }),
    );
  });
});
