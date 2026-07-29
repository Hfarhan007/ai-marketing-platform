import { ConflictException, ForbiddenException, Injectable, Optional } from '@nestjs/common';
import { AgentToolRegistry } from './agent-tool.registry.js';
import type { AgentToolContext } from './agent-tool.types.js';
import { AgentRunsRepository } from '../repositories/agent-runs.repository.js';
import { AiSafetyService } from '../../ai/safety/ai-safety.service.js';

@Injectable()
export class AgentToolExecutor {
  constructor(private readonly registry: AgentToolRegistry, private readonly runs: AgentRunsRepository, @Optional() private readonly safety?: AiSafetyService) {}
  async execute(input: { toolName: string; arguments: unknown; idempotencyKey: string; permittedTools: readonly string[]; approvalId?: string }, context: AgentToolContext) {
    if (!input.permittedTools.includes(input.toolName)) throw new ForbiddenException('Tool is not permitted for this agent');
    const tool = this.registry.get(input.toolName);
    this.safety?.validateTool({ tool: input.toolName, permittedTools: [...input.permittedTools], requiredPermission: tool.permission, permissions: [...context.permissions] });
    if (!context.permissions.includes(tool.permission)) throw new ForbiddenException('Caller lacks tool permission');
    const parsed = tool.schema.parse(input.arguments);
    const reservation = await this.runs.reserveTool(context.workspaceId, context.runId, input.toolName, input.idempotencyKey, tool.sensitive);
    if (reservation.duplicate) return reservation.execution;
    if (tool.sensitive && !input.approvalId) return reservation.execution;
    if (tool.sensitive) {
      const approved = await this.runs.approveTool(context.workspaceId, String(reservation.execution._id), input.approvalId ?? '');
      if (!approved) throw new ConflictException('Valid human approval is required');
    }
    const controller = new AbortController();
    const onAbort = () => controller.abort(context.signal.reason);
    context.signal.addEventListener('abort', onAbort, { once: true });
    const timer = setTimeout(() => controller.abort(new Error('Tool execution timed out')), tool.timeoutMs);
    try {
      const result = await Promise.race([
        tool.execute(parsed, { ...context, signal: controller.signal }),
        new Promise<never>((_resolve, reject) => controller.signal.addEventListener('abort', () => reject(controller.signal.reason instanceof Error ? controller.signal.reason : new Error('Tool execution aborted')), { once: true })),
      ]);
      await this.runs.completeTool(context.workspaceId, String(reservation.execution._id), result);
      return result;
    } catch (error) {
      await this.runs.failTool(context.workspaceId, String(reservation.execution._id), error);
      throw error;
    } finally {
      clearTimeout(timer);
      context.signal.removeEventListener('abort', onAbort);
    }
  }
}
