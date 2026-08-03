import { BadRequestException, Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { AiResponse } from '../providers/ai-provider.interface.js';
import { RESPONSE_CLASSIFICATIONS, type FactualityPolicy, type ResponseClassification } from './ai-execution.types.js';

export const factualResponseSchema = z.object({
  classification: z.enum(RESPONSE_CLASSIFICATIONS),
  answer: z.string().max(30_000),
  claims: z.array(z.object({ text: z.string().min(1).max(2_000), type: z.enum(['retrieved_fact', 'inference', 'generated_suggestion', 'action_result']), domain: z.enum(['general', 'crm', 'pricing', 'policy', 'appointment', 'tool']), sourceIds: z.array(z.string().min(1)).max(20), confidence: z.number().min(0).max(1), recordIds: z.array(z.string()).max(20).optional(), toolCallIndex: z.number().int().nonnegative().optional() }).strict()).max(100),
}).strict();
export type FactualResponse = z.infer<typeof factualResponseSchema>;

@Injectable()
export class ResponseControlsService {
  validate(response: AiResponse, input: { contract?: z.ZodType; semantic?: Array<(value: unknown) => string | null>; business?: Array<(value: unknown) => string | null>; factuality?: FactualityPolicy }) {
    let value = response.structured;
    if (input.contract) value = input.contract.parse(value);
    for (const validator of input.semantic ?? []) { const reason = validator(value); if (reason) throw new BadRequestException(`Semantic validation failed: ${reason}`); }
    for (const validator of input.business ?? []) { const reason = validator(value); if (reason) throw new BadRequestException(`Business-rule validation failed: ${reason}`); }
    if (input.factuality?.required) value = this.validateFactual(value, input.factuality);
    return { ...response, ...(value === undefined ? {} : { structured: value }) };
  }

  validateToolResults(response: AiResponse, results: unknown[]) {
    if (!response.structured) return response;
    const factual = factualResponseSchema.safeParse(response.structured);
    if (!factual.success) return response;
    for (const claim of factual.data.claims.filter(({ type }) => type === 'action_result')) {
      if (claim.toolCallIndex === undefined || !this.successfulToolResult(results[claim.toolCallIndex])) throw new BadRequestException('Model text cannot confirm an unverified tool action');
    }
    return response;
  }

  fallback(response: AiResponse, fallback: { content: string; classification: ResponseClassification }) {
    return { ...response, content: fallback.content, structured: { classification: fallback.classification, answer: fallback.content, claims: [] } };
  }

  correctivePrompt(error: unknown) {
    const reason = error instanceof Error ? error.message : 'invalid output';
    return `Your previous response was rejected (${reason.slice(0, 500)}). Return only schema-valid output. Cite every factual claim with provided source IDs. Label proposals as generated_suggestion. Never claim a data change succeeded; action_result requires an executed tool result.`;
  }

  private validateFactual(value: unknown, policy: FactualityPolicy): FactualResponse {
    const response = factualResponseSchema.parse(value), allowedSources = new Map(policy.evidence.map((evidence) => [evidence.sourceId, evidence])), knownRecords = new Set(policy.knownCrmRecordIds ?? []);
    let unsupported = false;
    for (const claim of response.claims) {
      if (claim.type === 'generated_suggestion') continue;
      if (!claim.sourceIds.length || claim.sourceIds.some((id) => !allowedSources.has(id))) unsupported = true;
      if (claim.domain !== 'general' && claim.domain !== 'tool' && claim.sourceIds.some((id) => allowedSources.get(id)?.kind !== claim.domain && !(claim.domain === 'crm' && allowedSources.get(id)?.kind === 'retrieval'))) unsupported = true;
      if (claim.recordIds?.some((id) => !knownRecords.has(id))) throw new BadRequestException('Response invented a CRM record');
      if (claim.confidence < (policy.requireHumanReviewBelow ?? 0)) response.classification = 'requires human review';
    }
    if (unsupported && policy.rejectUnsupported) throw new BadRequestException('Response contains unsupported assertions or missing citations');
    if (unsupported) response.classification = 'unsupported';
    const factualClaims = response.claims.filter(({ type }) => type === 'retrieved_fact');
    if (factualClaims.length && !['grounded answer', 'requires human review', 'unsupported'].includes(response.classification)) response.classification = 'grounded answer';
    return response;
  }
  private successfulToolResult(value: unknown) {
    if (!value || typeof value !== 'object') return false;
    const result = value as Record<string, unknown>;
    return result.status === 'completed' || result.status === 'created' || result.status === 'updated' || result.ok === true;
  }
}
