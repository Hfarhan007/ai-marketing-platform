import { ConflictException, ForbiddenException, Injectable, Optional } from '@nestjs/common';
import { AiSafetyService } from '../../ai/safety/ai-safety.service.js';
import { AgentRunsRepository } from '../repositories/agent-runs.repository.js';
import { AgentToolRegistry } from './agent-tool.registry.js';
import type { AgentToolContext } from './agent-tool.types.js';
import { requiresApproval } from './agent-tool.types.js';
import { assertSafeArguments, generatedIdempotencyKey, redact, stableValue, ToolRateLimiter } from './tool-security.js';

@Injectable()
export class AgentToolExecutor {
  private readonly limiter = new ToolRateLimiter();
  constructor(private readonly registry: AgentToolRegistry, private readonly runs: AgentRunsRepository, @Optional() private readonly safety?: AiSafetyService) {}

  async execute(input: { toolName: string; arguments: unknown; idempotencyKey?: string; permittedTools: readonly string[]; approvalId?: string; simulation?: boolean }, context: AgentToolContext) {
    if (!input.permittedTools.includes(input.toolName)) throw new ForbiddenException('Tool is not permitted for this agent');
    const tool = this.registry.get(input.toolName);
    const agentType = context.agentType ?? 'general';
    if (!tool.allowedAgentTypes.includes(agentType)) throw new ForbiddenException('Tool is not allowed for this agent type');
    if ((context.toolDepth ?? 0) >= 4) throw new ForbiddenException('Recursive tool-call limit exceeded');
    for (const permission of tool.requiredPermissions) if (!context.permissions.includes(permission)) throw new ForbiddenException('Caller lacks tool permission');
    this.safety?.validateTool({ tool: input.toolName, permittedTools: [...input.permittedTools], requiredPermission: tool.requiredPermissions[0]!, permissions: [...context.permissions] });
    this.limiter.consume(`${context.workspaceId}:${context.userId}:${tool.name}`, tool.rateLimit);

    const parsed = tool.inputSchema.parse(input.arguments);
    if ('workspaceId' in (parsed as object)) throw new ForbiddenException('Workspace is bound by the authenticated execution context');
    assertSafeArguments(parsed, tool.allowedUrlOrigins);
    const approvalRequired = requiresApproval(tool) && !input.simulation;
    const generatedKey = generatedIdempotencyKey(context.workspaceId, context.runId, tool, parsed);
    const idempotencyKey = `${tool.idempotency === 'generated' ? generatedKey : (input.idempotencyKey ?? generatedKey)}:${input.simulation ? 'simulation' : 'live'}`;
    const requestedArguments = tool.audit.arguments ? redact(parsed, tool.audit.redact) : null;
    const reservation = await this.runs.reserveTool(context.workspaceId, context.runId, tool.name, idempotencyKey, approvalRequired, { toolVersion: tool.version, risk: tool.risk, requestedArguments, simulation: input.simulation === true });
    if (reservation.duplicate && reservation.execution.status !== 'pending_approval') return reservation.execution;
    if (reservation.duplicate && !input.approvalId) return reservation.execution;
    if (approvalRequired && !input.approvalId) return reservation.execution;
    if (approvalRequired) {
      const approvedArguments = redact(parsed, tool.audit.redact);
      const approved = await this.runs.approveTool(context.workspaceId, String(reservation.execution._id), input.approvalId ?? '', approvedArguments);
      if (!approved || stableValue(approved.approvedArguments) !== stableValue(approvedArguments)) throw new ConflictException('Valid human approval for these exact arguments is required');
    }

    const controller = new AbortController(), onAbort = () => controller.abort(context.signal.reason);
    context.signal.addEventListener('abort', onAbort, { once: true });
    const timer = setTimeout(() => controller.abort(new Error('Tool execution timed out')), tool.timeoutMs);
    try {
      if (input.simulation && !tool.simulate) throw new ConflictException('Tool does not support simulation mode');
      const operation = input.simulation ? (value: unknown, executionContext: AgentToolContext) => tool.simulate!(value, executionContext) : (value: unknown, executionContext: AgentToolContext) => tool.execute(value, executionContext);
      const raw = await Promise.race([operation(parsed, { ...context, signal: controller.signal, toolDepth: (context.toolDepth ?? 0) + 1 }), new Promise<never>((_resolve, reject) => controller.signal.addEventListener('abort', () => reject(controller.signal.reason instanceof Error ? controller.signal.reason : new Error('Tool execution aborted')), { once: true }))]);
      const validated = tool.outputSchema.parse(raw), finalResult = tool.audit.result ? redact(validated, tool.audit.redact) : { status: 'completed' };
      await this.runs.completeTool(context.workspaceId, String(reservation.execution._id), finalResult);
      return finalResult;
    } catch (error) {
      await this.runs.failTool(context.workspaceId, String(reservation.execution._id), error);
      throw error;
    } finally {
      clearTimeout(timer);
      context.signal.removeEventListener('abort', onAbort);
    }
  }
}
