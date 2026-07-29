import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AiGatewayService } from '../ai/ai-gateway.service.js';
import type { Permission } from '../permissions/constants/permission.catalog.js';
import { AgentExecutionPolicy } from './policies/agent-execution.policy.js';
import { AgentRunsRepository } from './repositories/agent-runs.repository.js';

@Injectable()
export class AgentRunnerService {
  constructor(private readonly repository: AgentRunsRepository, private readonly gateway: AiGatewayService, private readonly policy: AgentExecutionPolicy) {}
  async run(input: { workspaceId: string; userId: string; agentId: string; message: string; correlationId: string; requestId?: string; permissions: Permission[]; signal?: AbortSignal }) {
    const { agent, version } = await this.repository.configuration(input.workspaceId, input.agentId);
    const requestId = input.requestId ?? randomUUID();
    const reserved = await this.repository.createRun({ workspaceId: input.workspaceId, userId: input.userId, agentId: String(agent._id), agentVersionId: String(version._id), requestId, correlationId: input.correlationId, deadline: new Date(Date.now() + version.usageLimits.maxDurationMs) });
    if (reserved.duplicate) return reserved.run;
    const runId = String(reserved.run._id);
    await this.repository.appendMessage(input.workspaceId, runId, 'user', input.message);
    this.policy.assertBudget(reserved.run, version.usageLimits);
    try {
      const history = await this.repository.messagesForRun(input.workspaceId, runId, version.memoryPolicy.shortTermMessages ?? 20);
      const response = await this.gateway.execute({ requestId, correlationId: input.correlationId, workspaceId: input.workspaceId, userId: input.userId, feature: 'agents', preferredModel: version.model, allowedProviders: [version.provider as never], messages: [{ role: 'system', content: version.instructions }, ...history.map((message) => ({ role: message.role as 'user' | 'assistant' | 'tool', content: message.content }))], maxTokens: version.tokenLimits.output, maxCostUsd: version.usageLimits.maxCostUsd, temperature: version.temperature, tools: [], dataClassification: 'confidential', ...(input.signal ? { signal: input.signal } : {}) });
      await this.repository.appendMessage(input.workspaceId, runId, 'assistant', response.content);
      await this.repository.recordUsage({ workspaceId: agent.workspaceId, runId: reserved.run._id, inputTokens: response.usage.inputTokens, outputTokens: response.usage.outputTokens, costUsd: 0, provider: version.provider, model: version.model });
      return this.repository.updateRun(input.workspaceId, runId, { $set: { status: 'completed', stopReason: 'completed' }, $inc: { iteration: 1 } });
    } catch (error) {
      await this.repository.updateRun(input.workspaceId, runId, { $set: { status: input.signal?.aborted ? 'cancelled' : 'failed', stopReason: error instanceof Error ? error.message.slice(0, 500) : 'failed' } });
      throw error;
    }
  }
  handoff(workspaceId: string, runId: string, reason: string) {
    return this.repository.updateRun(workspaceId, runId, { $set: { status: 'handed_off', stopReason: reason.slice(0, 500) } });
  }
}
