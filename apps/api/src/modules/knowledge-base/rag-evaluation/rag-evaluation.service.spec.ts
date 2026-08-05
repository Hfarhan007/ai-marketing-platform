import { describe, expect, it, vi } from 'vitest';
import {
  EVALUATION_CONFIGURATION,
  EVALUATION_DATASET,
  EVALUATION_OBSERVATIONS,
  EVALUATION_THRESHOLDS,
} from './fixtures/evaluation-dataset.fixture.js';
import { RagEvaluationService } from './rag-evaluation.service.js';

const setup = () => {
  const repository = {
    evaluate: vi.fn().mockResolvedValue({}),
    recordDrift: vi.fn().mockResolvedValue({}),
  };
  return { service: new RagEvaluationService(repository as never), repository };
};
describe('RAG evaluation and monitoring', () => {
  it('computes reproducible retrieval, answer, cost and abstention metrics and blocks failed rollout', async () => {
    const { service, repository } = setup();
    const result = await service.evaluate({
      workspaceId: 'workspace',
      datasetName: 'complete-rag-fixture',
      datasetVersion: '1.0.0',
      cases: EVALUATION_DATASET,
      observations: EVALUATION_OBSERVATIONS,
      configuration: EVALUATION_CONFIGURATION,
      thresholds: EVALUATION_THRESHOLDS,
    });
    expect(result.datasetHash).toHaveLength(64);
    expect(result.experimentId).toHaveLength(64);
    expect(result.automatedMetrics).toMatchObject({
      generationCostUsd: 0.052,
      noAnswerAccuracy: 1,
      lowScoreRetrievalRate: 0.125,
    });
    expect(result.automatedMetrics.embeddingCostUsd).toBeCloseTo(0.0082);
    expect(result.automatedMetrics.recallAtK).toBeLessThan(0.9);
    expect(result.rolloutBlocked).toBe(true);
    expect(() => service.assertProductionRollout(result)).toThrow('rollout blocked');
    expect(repository.evaluate).toHaveBeenCalledWith(
      expect.objectContaining({
        configuration: EVALUATION_CONFIGURATION,
        humanReview: { status: 'not_started', reviewedCases: 0 },
      }),
    );
  });

  it('compares chunking, embedding, retrieval, reranker and prompt variants deterministically', () => {
    const { service } = setup(),
      metrics = {
        recallAtK: 0.8,
        precisionAtK: 0.8,
        meanReciprocalRank: 1,
        normalizedDiscountedCumulativeGain: 0.8,
        sourceHitRate: 1,
        citationCorrectness: 1,
        citationCompleteness: 0.8,
        groundedness: 0.8,
        answerRelevance: 0.8,
        unsupportedClaimRate: 0.2,
        latencyMs: 100,
        embeddingCostUsd: 0.01,
        generationCostUsd: 0.02,
        noAnswerAccuracy: 1,
        zeroResultRate: 0.1,
        lowScoreRetrievalRate: 0.1,
      };
    const variants = [
      {
        configuration: {
          ...EVALUATION_CONFIGURATION,
          name: 'old',
          chunkingVersion: 'v1',
          embeddingModel: 'model-a',
          retrievalStrategy: 'vector' as const,
          reranker: 'none',
          promptVersion: 'p1',
        },
        automatedMetrics: metrics,
        passed: false,
      },
      {
        configuration: {
          ...EVALUATION_CONFIGURATION,
          name: 'new',
          chunkingVersion: 'v2',
          embeddingModel: 'model-b',
          retrievalStrategy: 'hybrid' as const,
          reranker: 'cross-encoder',
          promptVersion: 'p2',
        },
        automatedMetrics: { ...metrics, groundedness: 0.9 },
        passed: true,
      },
    ];
    expect(service.compare(variants)[0]?.configuration.name).toBe('new');
  });

  it('keeps human review separate and detects production drift', async () => {
    const { service, repository } = setup();
    const snapshot = await service.recordProductionDrift({
      workspaceId: 'workspace',
      windowStart: new Date('2026-08-01'),
      windowEnd: new Date('2026-08-02'),
      events: [
        {
          resultCount: 0,
          topScore: 0,
          latencyMs: 300,
          embeddingCostUsd: 0.01,
          generationCostUsd: 0,
        },
        {
          resultCount: 2,
          topScore: 0.1,
          latencyMs: 200,
          embeddingCostUsd: 0.01,
          generationCostUsd: 0.02,
        },
      ],
      baseline: { zeroResultRate: 0.1, lowScoreRetrievalRate: 0.1, latencyMs: 100 },
      lowScoreThreshold: 0.3,
      alertDelta: 0.2,
    });
    expect(snapshot.alerts).toEqual([
      'zero_result_rate_drift',
      'low_score_retrieval_rate_drift',
      'latency_drift',
    ]);
    expect(snapshot).toMatchObject({
      zeroResultRate: 0.5,
      lowScoreRetrievalRate: 0.5,
      sampleSize: 2,
    });
    expect(repository.recordDrift).toHaveBeenCalledOnce();
  });

  it('renders an explicit non-production quality report', async () => {
    const { service } = setup();
    const result = await service.evaluate({
      workspaceId: 'workspace',
      datasetName: 'fixture',
      datasetVersion: '1',
      cases: EVALUATION_DATASET,
      observations: EVALUATION_OBSERVATIONS,
      configuration: EVALUATION_CONFIGURATION,
      thresholds: EVALUATION_THRESHOLDS,
    });
    expect(service.renderReport(result)).toContain('not evidence of production RAG quality');
  });
});
