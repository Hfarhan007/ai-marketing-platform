import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { RagRepository } from '../repositories/rag.repository.js';

export type EvaluationCategory =
  | 'golden'
  | 'unanswerable'
  | 'adversarial'
  | 'multilingual'
  | 'permission-sensitive'
  | 'freshness-sensitive';
export interface RagEvaluationCase {
  id: string;
  question: string;
  category: EvaluationCategory;
  language: string;
  expectedSourceIds: string[];
  expectedChunkIds: string[];
  relevanceGrades?: Record<string, number>;
  expectedAnswerTerms?: string[];
  unanswerable?: boolean;
  principal?: { userId: string; groups: string[] };
  asOf?: string;
}
export interface RagExperimentConfiguration {
  name: string;
  chunkingVersion: string;
  embeddingProvider: string;
  embeddingModel: string;
  embeddingVersion: string;
  retrievalStrategy: 'keyword' | 'vector' | 'hybrid';
  fusionStrategy: 'rrf' | 'weighted';
  reranker: string;
  promptVersion: string;
  k: number;
  lowScoreThreshold: number;
  seed: number;
  codeVersion: string;
}
export interface RagCaseObservation {
  caseId: string;
  retrieved: Array<{ chunkId: string; sourceId: string; score: number }>;
  answer: string;
  answerClassification: string;
  citedChunkIds: string[];
  claims: Array<{ text: string; supported: boolean }>;
  groundedness?: number;
  latencyMs: number;
  embeddingCostUsd: number;
  generationCostUsd: number;
}
export interface RagAutomatedMetrics {
  recallAtK: number;
  precisionAtK: number;
  meanReciprocalRank: number;
  normalizedDiscountedCumulativeGain: number;
  sourceHitRate: number;
  citationCorrectness: number;
  citationCompleteness: number;
  groundedness: number;
  answerRelevance: number;
  unsupportedClaimRate: number;
  latencyMs: number;
  embeddingCostUsd: number;
  generationCostUsd: number;
  noAnswerAccuracy: number;
  zeroResultRate: number;
  lowScoreRetrievalRate: number;
}
export interface RegressionThresholds {
  minimum?: Partial<RagAutomatedMetrics>;
  maximum?: Partial<RagAutomatedMetrics>;
  maximumRegression?: Partial<RagAutomatedMetrics>;
  mandatory: Array<keyof RagAutomatedMetrics>;
}
export interface HumanReviewSummary {
  status: 'not_started' | 'in_progress' | 'complete';
  reviewedCases: number;
  factuality?: number;
  usefulness?: number;
  notes?: string;
}

@Injectable()
export class RagEvaluationService {
  constructor(private readonly repository: RagRepository) {}

  async evaluate(input: {
    workspaceId: string;
    datasetName: string;
    datasetVersion: string;
    cases: RagEvaluationCase[];
    observations: RagCaseObservation[];
    configuration: RagExperimentConfiguration;
    thresholds: RegressionThresholds;
    baseline?: RagAutomatedMetrics;
    humanReview?: HumanReviewSummary;
  }) {
    this.validate(input.cases, input.observations, input.configuration);
    const datasetHash = this.hash(input.cases),
      experimentId = this.hash({ datasetHash, configuration: input.configuration }),
      automatedMetrics = this.metrics(
        input.cases,
        input.observations,
        input.configuration.k,
        input.configuration.lowScoreThreshold,
      ),
      gate = this.gate(automatedMetrics, input.thresholds, input.baseline),
      record = {
        workspaceId: input.workspaceId,
        experimentId,
        datasetName: input.datasetName,
        datasetVersion: input.datasetVersion,
        datasetHash,
        configuration: input.configuration,
        automatedMetrics,
        humanReview: input.humanReview ?? { status: 'not_started', reviewedCases: 0 },
        thresholds: input.thresholds,
        passed: gate.passed,
        rolloutBlocked: !gate.passed,
        failures: gate.failures,
        caseCount: input.cases.length,
        reproducibility: {
          seed: input.configuration.seed,
          codeVersion: input.configuration.codeVersion,
          observationHash: this.hash(input.observations),
        },
      };
    await this.repository.evaluate(record);
    return record;
  }

  compare(
    experiments: Array<{
      configuration: RagExperimentConfiguration;
      automatedMetrics: RagAutomatedMetrics;
      passed: boolean;
    }>,
  ) {
    return [...experiments].sort(
      (a, b) =>
        Number(b.passed) - Number(a.passed) ||
        b.automatedMetrics.groundedness - a.automatedMetrics.groundedness ||
        b.automatedMetrics.recallAtK - a.automatedMetrics.recallAtK ||
        a.automatedMetrics.latencyMs - b.automatedMetrics.latencyMs,
    );
  }

  async recordProductionDrift(input: {
    workspaceId: string;
    windowStart: Date;
    windowEnd: Date;
    events: Array<{
      resultCount: number;
      topScore: number;
      latencyMs: number;
      embeddingCostUsd: number;
      generationCostUsd: number;
    }>;
    baseline: { zeroResultRate: number; lowScoreRetrievalRate: number; latencyMs: number };
    lowScoreThreshold: number;
    alertDelta: number;
  }) {
    const count = input.events.length,
      snapshot = {
        workspaceId: input.workspaceId,
        windowStart: input.windowStart,
        windowEnd: input.windowEnd,
        sampleSize: count,
        zeroResultRate: count
          ? input.events.filter((event) => event.resultCount === 0).length / count
          : 0,
        lowScoreRetrievalRate: count
          ? input.events.filter(
              (event) => event.resultCount > 0 && event.topScore < input.lowScoreThreshold,
            ).length / count
          : 0,
        latencyMs: count
          ? input.events.reduce((sum, event) => sum + event.latencyMs, 0) / count
          : 0,
        embeddingCostUsd: input.events.reduce((sum, event) => sum + event.embeddingCostUsd, 0),
        generationCostUsd: input.events.reduce((sum, event) => sum + event.generationCostUsd, 0),
        alerts: [] as string[],
      };
    if (snapshot.zeroResultRate - input.baseline.zeroResultRate > input.alertDelta)
      snapshot.alerts.push('zero_result_rate_drift');
    if (snapshot.lowScoreRetrievalRate - input.baseline.lowScoreRetrievalRate > input.alertDelta)
      snapshot.alerts.push('low_score_retrieval_rate_drift');
    if (
      input.baseline.latencyMs > 0 &&
      snapshot.latencyMs / input.baseline.latencyMs - 1 > input.alertDelta
    )
      snapshot.alerts.push('latency_drift');
    await this.repository.recordDrift(snapshot);
    return snapshot;
  }

  assertProductionRollout(evaluation: { rolloutBlocked: boolean; experimentId: string }) {
    if (evaluation.rolloutBlocked)
      throw new Error(
        `Production RAG rollout blocked by mandatory evaluation ${evaluation.experimentId}`,
      );
  }

  renderReport(result: Awaited<ReturnType<RagEvaluationService['evaluate']>>) {
    const rows = (Object.entries(result.automatedMetrics) as Array<[string, number]>)
      .map(([metric, value]) => `| ${metric} | ${value.toFixed(4)} |`)
      .join('\n');
    return `# RAG evaluation report\n\nExperiment: \`${result.experimentId}\`  \nDataset: ${result.datasetName} ${result.datasetVersion} (\`${result.datasetHash}\`)  \nRollout: **${result.rolloutBlocked ? 'BLOCKED' : 'eligible'}**\n\n## Reproducible configuration\n\n\`\`\`json\n${JSON.stringify(result.configuration, null, 2)}\n\`\`\`\n\n## Automated metrics\n\n| Metric | Value |\n|---|---:|\n${rows}\n\n## Human review\n\nStatus: ${result.humanReview.status}; reviewed cases: ${result.humanReview.reviewedCases}. Human review is reported separately and is not included in automated gate scores.\n\n## Gate failures\n\n${result.failures.length ? result.failures.map((failure) => `- ${failure}`).join('\n') : '- None'}\n\nThis fixture report validates the evaluation machinery only. It is not evidence of production RAG quality.\n`;
  }

  private metrics(
    cases: RagEvaluationCase[],
    observations: RagCaseObservation[],
    k: number,
    lowScoreThreshold: number,
  ): RagAutomatedMetrics {
    const byId = new Map(observations.map((observation) => [observation.caseId, observation])),
      values = cases.map((test) => this.caseMetrics(test, byId.get(test.id)!, k));
    const average = (key: keyof (typeof values)[number]) =>
      values.reduce((sum, value) => sum + value[key], 0) / values.length;
    return {
      recallAtK: average('recallAtK'),
      precisionAtK: average('precisionAtK'),
      meanReciprocalRank: average('meanReciprocalRank'),
      normalizedDiscountedCumulativeGain: average('normalizedDiscountedCumulativeGain'),
      sourceHitRate: average('sourceHitRate'),
      citationCorrectness: average('citationCorrectness'),
      citationCompleteness: average('citationCompleteness'),
      groundedness: average('groundedness'),
      answerRelevance: average('answerRelevance'),
      unsupportedClaimRate: average('unsupportedClaimRate'),
      latencyMs: average('latencyMs'),
      embeddingCostUsd: observations.reduce((sum, value) => sum + value.embeddingCostUsd, 0),
      generationCostUsd: observations.reduce((sum, value) => sum + value.generationCostUsd, 0),
      noAnswerAccuracy: average('noAnswerAccuracy'),
      zeroResultRate:
        observations.filter((value) => value.retrieved.length === 0).length / observations.length,
      lowScoreRetrievalRate:
        observations.filter(
          (value) =>
            value.retrieved.length > 0 && (value.retrieved[0]?.score ?? 0) < lowScoreThreshold,
        ).length / observations.length,
    };
  }
  private caseMetrics(test: RagEvaluationCase, observation: RagCaseObservation, k: number) {
    const ranked = observation.retrieved.slice(0, k),
      relevant = new Set(test.expectedChunkIds),
      retrievedRelevant = ranked.filter((item) => relevant.has(item.chunkId));
    const first = ranked.findIndex((item) => relevant.has(item.chunkId)),
      gains = ranked.map(
        (item) => test.relevanceGrades?.[item.chunkId] ?? (relevant.has(item.chunkId) ? 1 : 0),
      );
    const dcg = gains.reduce((sum, gain, index) => sum + (2 ** gain - 1) / Math.log2(index + 2), 0),
      ideal = Object.values(
        test.relevanceGrades ?? Object.fromEntries(test.expectedChunkIds.map((id) => [id, 1])),
      )
        .sort((a, b) => b - a)
        .slice(0, k)
        .reduce((sum, gain, index) => sum + (2 ** gain - 1) / Math.log2(index + 2), 0);
    const citations = new Set(observation.citedChunkIds),
      supportedClaims = observation.claims.filter((claim) => claim.supported).length;
    const words = new Set(observation.answer.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []),
      terms = test.expectedAnswerTerms?.map((term) => term.toLocaleLowerCase()) ?? [];
    return {
      recallAtK: relevant.size
        ? retrievedRelevant.length / relevant.size
        : test.unanswerable
          ? Number(ranked.length === 0)
          : 1,
      precisionAtK: ranked.length
        ? retrievedRelevant.length / ranked.length
        : Number(Boolean(test.unanswerable)),
      meanReciprocalRank: first < 0 ? 0 : 1 / (first + 1),
      normalizedDiscountedCumulativeGain: ideal
        ? dcg / ideal
        : Number(Boolean(test.unanswerable) && ranked.length === 0),
      sourceHitRate: test.expectedSourceIds.length
        ? Number(ranked.some((item) => test.expectedSourceIds.includes(item.sourceId)))
        : Number(Boolean(test.unanswerable) && ranked.length === 0),
      citationCorrectness: citations.size
        ? [...citations].filter((id) => ranked.some((item) => item.chunkId === id)).length /
          citations.size
        : Number(Boolean(test.unanswerable)),
      citationCompleteness: relevant.size
        ? [...relevant].filter((id) => citations.has(id)).length / relevant.size
        : Number(Boolean(test.unanswerable)),
      groundedness:
        observation.groundedness ??
        (observation.claims.length
          ? supportedClaims / observation.claims.length
          : Number(Boolean(test.unanswerable))),
      answerRelevance: terms.length
        ? terms.filter((term) => words.has(term)).length / terms.length
        : 1,
      unsupportedClaimRate: observation.claims.length
        ? 1 - supportedClaims / observation.claims.length
        : 0,
      latencyMs: observation.latencyMs,
      noAnswerAccuracy: Number(
        Boolean(test.unanswerable) ===
          (observation.answerClassification === 'insufficient_information'),
      ),
    };
  }
  private gate(
    metrics: RagAutomatedMetrics,
    thresholds: RegressionThresholds,
    baseline?: RagAutomatedMetrics,
  ) {
    const failures: string[] = [];
    for (const metric of thresholds.mandatory) {
      const value = metrics[metric],
        minimum = thresholds.minimum?.[metric],
        maximum = thresholds.maximum?.[metric],
        regression = thresholds.maximumRegression?.[metric];
      if (minimum !== undefined && value < minimum)
        failures.push(`${metric} ${value.toFixed(4)} is below ${minimum.toFixed(4)}`);
      if (maximum !== undefined && value > maximum)
        failures.push(`${metric} ${value.toFixed(4)} exceeds ${maximum.toFixed(4)}`);
      if (regression !== undefined && baseline && baseline[metric] - value > regression)
        failures.push(`${metric} regressed by ${(baseline[metric] - value).toFixed(4)}`);
    }
    return { passed: failures.length === 0, failures };
  }
  private validate(
    cases: RagEvaluationCase[],
    observations: RagCaseObservation[],
    configuration: RagExperimentConfiguration,
  ) {
    if (!cases.length || new Set(cases.map((test) => test.id)).size !== cases.length)
      throw new Error('Evaluation dataset must contain unique cases');
    if (configuration.k < 1 || !Number.isInteger(configuration.seed))
      throw new Error('Invalid reproducibility configuration');
    const observed = new Set(observations.map((value) => value.caseId));
    if (observations.length !== cases.length || cases.some((test) => !observed.has(test.id)))
      throw new Error('Every evaluation case requires exactly one observation');
  }
  private hash(value: unknown) {
    return createHash('sha256').update(JSON.stringify(value)).digest('hex');
  }
}
