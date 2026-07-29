import { Injectable } from '@nestjs/common';
import type { AiProvider } from '../providers/ai-provider.interface.js';
import { AiGovernanceRepository } from '../repositories/ai-governance.repository.js';
export interface EvaluationResult { answerRelevance: number; citationAccuracy: number; groundedness: number; toolCallCorrectness: number; policyCompliance: number }
@Injectable()
export class AiEvaluationService {
  constructor(private readonly repository: AiGovernanceRepository) {}
  score(input: { answer: string; expectedTerms?: string[]; citations?: Array<{ sourceId: string }>; expectedSourceIds?: string[]; toolCalls?: string[]; expectedTools?: string[]; policyViolations?: number }): EvaluationResult {
    const overlap = (expected: string[], actual: string[]) => expected.length ? expected.filter((value) => actual.includes(value)).length / expected.length : 1;
    const words = input.answer.toLocaleLowerCase().split(/\W+/u);
    const relevance = overlap((input.expectedTerms ?? []).map((v) => v.toLocaleLowerCase()), words);
    const citationAccuracy = overlap(input.expectedSourceIds ?? [], (input.citations ?? []).map((v) => v.sourceId));
    const toolCallCorrectness = overlap(input.expectedTools ?? [], input.toolCalls ?? []);
    return { answerRelevance: relevance, citationAccuracy, groundedness: Math.min(relevance, citationAccuracy), toolCallCorrectness, policyCompliance: input.policyViolations ? 0 : 1 };
  }
  async compare(input: { workspaceId: string; suite: string; provider: AiProvider; model: string; promptVersion: string; baseline?: EvaluationResult }) {
    const cases = await this.repository.goldenCases(input.workspaceId), scores: EvaluationResult[] = [];
    for (const test of cases) {
      const response = await input.provider.chat({ requestId: `eval:${String(test._id)}`, correlationId: input.suite, workspaceId: input.workspaceId, feature: 'evaluation', model: input.model, messages: [{ role: 'user', content: test.input }], maxTokens: 500, temperature: 0 });
      scores.push(this.score({ ...(test.expectations as Omit<Parameters<AiEvaluationService['score']>[0], 'answer'>), answer: response.content }));
    }
    const aggregate = this.average(scores), passed = Object.values(aggregate).every((value) => value >= 0.8) && (!input.baseline || aggregate.groundedness >= input.baseline.groundedness);
    await this.repository.evaluation({ workspaceId: input.workspaceId, suite: input.suite, provider: input.provider.name, model: input.model, promptVersion: input.promptVersion, scores: aggregate, passed });
    return { scores: aggregate, passed };
  }
  private average(values: EvaluationResult[]): EvaluationResult {
    const keys = ['answerRelevance', 'citationAccuracy', 'groundedness', 'toolCallCorrectness', 'policyCompliance'] as const;
    return Object.fromEntries(keys.map((key) => [key, values.length ? values.reduce((sum, value) => sum + value[key], 0) / values.length : 0])) as unknown as EvaluationResult;
  }
}
