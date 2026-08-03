import { describe, expect, it, vi } from 'vitest';
import { DefaultOrchestrationPolicy } from './orchestration.policy.js';
import type { DelegatedTask, OrchestrationAuditPort, SubAgentResult } from './orchestration.types.js';
import { MultiAgentOrchestratorService } from './multi-agent-orchestrator.service.js';

const budget = () => ({ maxSubAgentRuns: 3, maxDepth: 1, maxTokens: 1_000, maxCostUsd: 1, deadline: new Date(Date.now() + 10_000) });
function output(task: DelegatedTask) {
  const evidence = [{ sourceId: `${task.id}:source`, claim: 'verified', confidence: 0.9 }];
  if (task.role === 'campaign_analyst') return { findings: ['drop'], anomalies: ['open rate'], evidence };
  if (task.role === 'knowledge_researcher') return { facts: ['seasonality'], evidence };
  if (task.role === 'crm_analyst') return { recommendation: 'human_review', rationale: ['insufficient history'], evidence };
  if (task.role === 'support_assistant') return { summary: 'Customer needs help', openQuestions: [], evidence };
  return { decision: 'requires_changes', issues: ['missing disclaimer'], evidence };
}
function result(task: DelegatedTask, overrides: Partial<SubAgentResult> = {}): SubAgentResult {
  return { taskId: task.id, role: task.role, output: output(task), sourceIds: [`${task.id}:source`], inputTokens: 20, outputTokens: 10, costUsd: 0.01, startedAt: new Date(), completedAt: new Date(), ...overrides };
}
function setup(execute = vi.fn((task: DelegatedTask) => Promise.resolve(result(task)))) {
  const audit = { record: vi.fn<OrchestrationAuditPort['record']>(() => Promise.resolve()) };
  return { execute, audit, service: new MultiAgentOrchestratorService(new DefaultOrchestrationPolicy(), { execute }, audit) };
}

describe('controlled multi-agent orchestration', () => {
  it('rejects loops and excessive delegation depth or run counts', async () => {
    const { service, execute } = setup();
    await expect(service.execute({ workspaceId: 'w', userId: 'u', workflow: 'campaign_performance_investigation', payload: {}, budget: { ...budget(), maxDepth: 0 } })).rejects.toThrow('depth');
    await expect(service.execute({ workspaceId: 'w', userId: 'u', workflow: 'campaign_performance_investigation', payload: {}, budget: { ...budget(), maxSubAgentRuns: 1 } })).rejects.toThrow('runs');
    expect(execute).not.toHaveBeenCalled();
  });

  it('enforces one shared token and cost budget across sub-agents', async () => {
    const { service, audit } = setup(vi.fn((task: DelegatedTask) => Promise.resolve(result(task, { inputTokens: 60, outputTokens: 20, costUsd: 0.4 }))));
    await expect(service.execute({ workspaceId: 'w', userId: 'u', workflow: 'campaign_performance_investigation', payload: {}, budget: { ...budget(), maxTokens: 100, maxCostUsd: 0.5 } })).rejects.toThrow('budget');
    expect(audit.record).not.toHaveBeenCalledWith(expect.objectContaining({ status: 'completed' }));
  });

  it('applies role permissions, tools, and data scopes independently', async () => {
    const policy = new DefaultOrchestrationPolicy();
    await expect(policy.authorize({ workspaceId: 'w', role: 'campaign_analyst', permissions: ['campaigns.manage'], tools: ['task_creation'], dataScopes: ['crm'] })).rejects.toThrow('scope');
    const calls: DelegatedTask[] = [], { service } = setup(vi.fn((task: DelegatedTask) => { calls.push(task); return Promise.resolve(result(task)); }));
    await service.execute({ workspaceId: 'w', userId: 'u', workflow: 'lead_qualification_review', payload: {}, budget: budget() });
    expect(calls[0]).toMatchObject({ role: 'crm_analyst', tools: ['contact_lookup', 'company_lookup', 'deal_lookup'], dataScopes: ['crm'], depth: 1 });
  });

  it('rejects unverifiable output and preserves verified provenance, cost, and latency', async () => {
    const invalid = setup(vi.fn((task: DelegatedTask) => Promise.resolve(result(task, { sourceIds: [] }))));
    await expect(invalid.service.execute({ workspaceId: 'w', userId: 'u', workflow: 'support_conversation_summary', payload: {}, budget: budget() })).rejects.toThrow('unverifiable');
    const valid = setup(), completed = await valid.service.execute({ workspaceId: 'w', userId: 'u', workflow: 'support_conversation_summary', payload: {}, budget: budget() });
    expect(completed).toMatchObject({ status: 'completed', totalTokens: 30, totalCostUsd: 0.01 });
    const audited = valid.audit.record.mock.calls[0]![0];
    expect(audited).toMatchObject({ workspaceId: 'w', results: [expect.objectContaining({ sourceIds: ['support-summary:source'] })], totalCostUsd: 0.01 });
    expect(audited.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('requires approval for compliance review, supports cancellation, and avoids unjustified orchestration', async () => {
    const { service, execute } = setup();
    await expect(service.execute({ workspaceId: 'w', userId: 'u', workflow: 'compliance_sensitive_message_review', payload: {}, budget: budget() })).resolves.toMatchObject({ status: 'awaiting_approval' });
    await expect(service.execute({ workspaceId: 'w', userId: 'u', workflow: 'lead_qualification_review', payload: {}, budget: budget(), deterministicWorkflowSufficient: true })).rejects.toThrow('not justified');
    const controller = new AbortController(); controller.abort(new Error('cancelled'));
    await expect(service.execute({ workspaceId: 'w', userId: 'u', workflow: 'lead_qualification_review', payload: {}, budget: budget(), signal: controller.signal })).rejects.toThrow('cancelled');
    expect(execute).not.toHaveBeenCalled();
  });
});
