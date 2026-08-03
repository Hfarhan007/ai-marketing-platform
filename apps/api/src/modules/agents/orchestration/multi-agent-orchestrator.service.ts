import { BadRequestException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { ORCHESTRATION_AUDIT, ORCHESTRATION_POLICY, SUB_AGENT_EXECUTION, type OrchestrationAuditPort, type OrchestrationPolicyPort, type OrchestrationWorkflow, type SharedBudget, type SubAgentExecutionPort, type SubAgentResult } from './orchestration.types.js';
import { workflowTasks } from './orchestration.workflows.js';

@Injectable()
export class MultiAgentOrchestratorService {
  constructor(@Inject(ORCHESTRATION_POLICY) private readonly policy: OrchestrationPolicyPort, @Inject(SUB_AGENT_EXECUTION) private readonly agents: SubAgentExecutionPort, @Inject(ORCHESTRATION_AUDIT) private readonly audit: OrchestrationAuditPort) {}
  async execute(input: { workspaceId: string; userId: string; workflow: OrchestrationWorkflow; payload: unknown; budget: SharedBudget; signal?: AbortSignal; deterministicWorkflowSufficient?: boolean; humanApprovalId?: string }) {
    if (input.deterministicWorkflowSufficient) throw new BadRequestException('Multi-agent execution is not justified for a deterministic workflow');
    if (input.workflow === 'compliance_sensitive_message_review' && !input.humanApprovalId) return { status: 'awaiting_approval' as const, results: [], totalTokens: 0, totalCostUsd: 0, latencyMs: 0 };
    const started = Date.now(), tasks = workflowTasks(input.workflow, input.payload);
    if (input.budget.maxDepth < 1 || tasks.some(({ depth }) => depth > input.budget.maxDepth)) throw new ForbiddenException('Maximum delegation depth exceeded');
    if (tasks.length > input.budget.maxSubAgentRuns) throw new ForbiddenException('Maximum sub-agent runs exceeded');
    const controller = new AbortController(), abort = () => controller.abort(input.signal?.reason ?? new Error('Orchestration cancelled'));
    input.signal?.addEventListener('abort', abort, { once: true });
    if (input.signal?.aborted) abort();
    const timer = setTimeout(() => controller.abort(new Error('Orchestration deadline exceeded')), Math.max(1, input.budget.deadline.valueOf() - Date.now()));
    const results: SubAgentResult[] = []; let totalTokens = 0, totalCostUsd = 0;
    try {
      for (const task of tasks) {
        if (controller.signal.aborted) throw controller.signal.reason;
        await this.policy.authorize({ workspaceId: input.workspaceId, role: task.role, permissions: task.permissions, tools: task.tools, dataScopes: task.dataScopes });
        const result = await this.agents.execute(task, { workspaceId: input.workspaceId, userId: input.userId, signal: controller.signal, remainingTokens: input.budget.maxTokens - totalTokens, remainingCostUsd: input.budget.maxCostUsd - totalCostUsd });
        const output = task.resultSchema.parse(result.output), tokens = result.inputTokens + result.outputTokens;
        if (result.taskId !== task.id || result.role !== task.role || !result.sourceIds.length) throw new BadRequestException('Coordinator rejected unverifiable sub-agent output');
        totalTokens += tokens; totalCostUsd += result.costUsd;
        if (totalTokens > input.budget.maxTokens || totalCostUsd > input.budget.maxCostUsd) throw new ForbiddenException('Shared orchestration budget exceeded');
        results.push({ ...result, output });
      }
      const latencyMs = Date.now() - started;
      await this.audit.record({ workspaceId: input.workspaceId, workflow: input.workflow, status: 'completed', results, totalTokens, totalCostUsd, latencyMs });
      return { status: 'completed' as const, results, totalTokens, totalCostUsd, latencyMs };
    } catch (error) {
      await this.audit.record({ workspaceId: input.workspaceId, workflow: input.workflow, status: controller.signal.aborted ? 'cancelled' : 'failed', results, totalTokens, totalCostUsd, latencyMs: Date.now() - started });
      throw error;
    } finally { clearTimeout(timer); input.signal?.removeEventListener('abort', abort); }
  }
}
