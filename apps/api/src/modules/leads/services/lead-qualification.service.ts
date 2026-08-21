import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import type { WorkspaceRequestContext } from '../../../common/types/workspace-context.js';
import { AiControlPlaneService } from '../../ai/control-plane/ai-control-plane.service.js';
import type { AiProviderName } from '../../ai/providers/ai-provider.interface.js';
import { PiiRedactionService } from '../../ai/safety/pii-redaction.service.js';
import { LEAD_QUALIFICATION_PROMPT_VERSION, LEAD_QUALIFICATION_SYSTEM_PROMPT, leadQualificationContract } from '../lead-qualification.contract.js';
import { LeadQualificationRepository } from '../repositories/lead-qualification.repository.js';

const PROVIDER_MODELS: Record<Exclude<AiProviderName, 'mock'>, string> = {
  openai: 'gpt-4.1-mini', gemini: 'gemini-2.5-flash', groq: 'llama-3.3-70b-versatile',
  openrouter: 'openai/gpt-4.1-mini', ollama: 'llama3.2',
};

@Injectable()
export class LeadQualificationService {
  constructor(private readonly controlPlane: AiControlPlaneService, private readonly pii: PiiRedactionService, private readonly results: LeadQualificationRepository, private readonly config: ConfigService) {}
  async qualify(context: WorkspaceRequestContext, input: { text: string; leadId?: string; signal?: AbortSignal }) {
    const provider = this.config.get<string>('ai.provider');
    if (!provider || provider === 'disabled' || !(provider in PROVIDER_MODELS))
      throw new ServiceUnavailableException('Configure one supported AI_PROVIDER for lead qualification');
    const selected = provider as Exclude<AiProviderName, 'mock'>;
    const requestId = randomUUID();
    const redacted = this.pii.redact(input.text);
    if (!redacted.trim()) throw new BadRequestException('Lead text is required');
    const allowedProviders: AiProviderName[] = [selected];
    if (this.config.get<boolean>('ai.developmentMockFallback')) allowedProviders.push('mock');
    const execution = await this.controlPlane.execute({
      requestId, correlationId: requestId, workspaceId: context.workspaceId, userId: context.userId,
      feature: 'lead_qualification', purpose: 'qualify_lead', promptVersion: LEAD_QUALIFICATION_PROMPT_VERSION,
      messages: [{ role: 'system', content: LEAD_QUALIFICATION_SYSTEM_PROMPT }, { role: 'user', content: redacted }],
      allowedProviders, preferredModel: PROVIDER_MODELS[selected], capabilities: ['chat', 'json'],
      outputContract: leadQualificationContract, correctiveRetries: 0, temperature: 0,
      dataClassification: 'restricted', retentionPolicy: { retainPrompt: false, days: 0 },
      budget: { maxInputTokens: 4_000, maxOutputTokens: 700, maxCostUsd: 0.05 },
      deadline: new Date(Date.now() + (this.config.get<number>('ai.timeoutMs') ?? 30_000)),
      permittedTools: [], tools: [], routingPolicy: { retries: 0, timeoutMs: this.config.get<number>('ai.timeoutMs') ?? 30_000 },
      ...(input.signal ? { signal: input.signal } : {}),
    });
    const validated = leadQualificationContract.parse(execution.response.structured);
    const result = leadQualificationContract.parse({
      ...validated,
      summary: this.pii.redact(validated.summary),
      recommendedAction: this.pii.redact(validated.recommendedAction),
      suggestedReply: this.pii.redact(validated.suggestedReply),
    });
    const saved = await this.results.save({ workspaceId: context.workspaceId, userId: context.userId, ...(input.leadId ? { leadId: input.leadId } : {}), requestId, promptVersion: LEAD_QUALIFICATION_PROMPT_VERSION, provider: execution.context.provider!, model: execution.context.model!, result, inputTokens: execution.response.usage.inputTokens, outputTokens: execution.response.usage.outputTokens, costUsd: execution.response.costUsd ?? 0 });
    return { id: String(saved._id), requestId, ...result, provider: execution.context.provider, model: execution.context.model, promptVersion: LEAD_QUALIFICATION_PROMPT_VERSION, usage: execution.response.usage, costUsd: execution.response.costUsd ?? 0 };
  }
}
