import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AiGatewayService } from '../ai-gateway.service.js';
import { PromptRegistryService } from '../prompts/prompt-registry.service.js';
import { AI_TOOL_EXECUTION_PORT, type AiToolExecutionPort } from './ai-tool-execution.port.js';
import type { AiExecutionContext, AiExecutionResult, AiRequestCommand } from './ai-execution.types.js';
import { WorkspaceAiPolicyResolver } from './workspace-ai-policy-resolver.service.js';
@Injectable()
export class AiControlPlaneService {
  constructor(private readonly gateway: AiGatewayService, private readonly prompts: PromptRegistryService, private readonly policies: WorkspaceAiPolicyResolver, @Inject(AI_TOOL_EXECUTION_PORT) private readonly tools: AiToolExecutionPort) {}
  async execute(command: AiRequestCommand): Promise<AiExecutionResult> {
    if (command.deadline.valueOf() <= Date.now()) throw new BadRequestException('AI execution deadline exceeded');
    const requestId = command.requestId ?? randomUUID(), policy = await this.policies.resolve(command.workspaceId, command.feature);
    const resolved = command.promptKey ? await this.prompts.resolve(command.workspaceId, command.promptKey, { feature: command.feature, environment: command.environment ?? 'production', variables: command.promptVariables ?? {} }) : null;
    const prompt = resolved ? this.interpolate(resolved.content, command.promptVariables ?? {}) : null;
    const messages = [...(prompt ? [{ role: 'system' as const, content: prompt }] : []), ...(command.messages ?? [])];
    if (!messages.length) throw new BadRequestException('AI request has no prompt or messages');
    const controller = new AbortController(), abort = () => controller.abort(command.signal?.reason ?? new Error('AI execution cancelled'));
    command.signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(() => controller.abort(new Error('AI execution deadline exceeded')), Math.max(1, command.deadline.valueOf() - Date.now()));
    const context: AiExecutionContext = { requestId, correlationId: command.correlationId, workspaceId: command.workspaceId, userId: command.userId, agentId: command.agentId ?? null, feature: command.feature, purpose: command.purpose, provider: null, model: null, promptVersion: command.promptVersion ?? (resolved ? String(resolved.version) : null), knowledgeScope: command.knowledgeScope ?? [], permittedTools: command.permittedTools ?? [], dataClassification: command.dataClassification, retentionPolicy: command.retentionPolicy, budget: command.budget, deadline: command.deadline };
    try {
      const routingPolicy = { ...policy.routingPolicy, ...command.routingPolicy };
      const outputSchema = command.jsonSchema ?? resolved?.outputSchema ?? undefined;
      const response = await this.gateway.execute({ requestId, correlationId: command.correlationId, workspaceId: command.workspaceId, userId: command.userId, feature: command.feature, messages, allowedProviders: command.allowedProviders ?? policy.allowedProviders, maxTokens: Math.min(command.budget.maxOutputTokens, policy.remainingTokens), maxCostUsd: Math.min(command.budget.maxCostUsd, policy.remainingCostUsd), dataClassification: command.dataClassification, signal: controller.signal, routingPolicy, executionContext: { agentId: context.agentId, purpose: context.purpose, promptVersion: context.promptVersion, knowledgeScope: context.knowledgeScope, permittedTools: context.permittedTools, retentionPolicy: context.retentionPolicy, budget: { maxCostUsd: context.budget.maxCostUsd, maxOutputTokens: context.budget.maxOutputTokens }, deadline: context.deadline }, ...(command.budget.maxInputTokens === undefined ? {} : { maxInputTokens: command.budget.maxInputTokens }), ...(command.capabilities ? { capabilities: command.capabilities } : {}), ...(command.preferredModel ? { preferredModel: command.preferredModel } : {}), ...(command.tools ? { tools: command.tools.filter((tool) => context.permittedTools.includes(tool.name)) } : {}), ...(command.temperature === undefined ? {} : { temperature: command.temperature }), ...(outputSchema ? { jsonSchema: outputSchema } : {}), ...(command.cacheable === undefined ? {} : { cacheable: command.cacheable }) });
      await this.tools.execute(response.toolCalls ?? [], context);
      return { context: { ...context, provider: response.provider ?? null, model: response.model ?? null }, response };
    } finally {
      clearTimeout(timer); command.signal?.removeEventListener('abort', abort);
    }
  }
  async *stream(command: AiRequestCommand) {
    const result = await this.execute(command);
    yield { content: result.response.content, done: true, usage: result.response.usage, context: result.context };
  }
  private interpolate(template: string, variables: Record<string, string | number | boolean>) {
    return template.replace(/\{\{([A-Za-z0-9_]+)\}\}/gu, (_match, key: string) => String(variables[key] ?? ''));
  }
}
