import type { Permission } from '../../permissions/constants/permission.catalog.js';
import type { z } from 'zod';

export const AGENT_ROLES = ['coordinator', 'crm_analyst', 'campaign_analyst', 'knowledge_researcher', 'support_assistant', 'compliance_reviewer'] as const;
export type OrchestrationRole = (typeof AGENT_ROLES)[number];
export type OrchestrationWorkflow = 'campaign_performance_investigation' | 'lead_qualification_review' | 'support_conversation_summary' | 'compliance_sensitive_message_review';
export interface DelegatedTask { id: string; role: Exclude<OrchestrationRole, 'coordinator'>; objective: string; input: unknown; tools: string[]; permissions: Permission[]; dataScopes: string[]; depth: number; resultSchema: z.ZodType }
export interface SubAgentResult { taskId: string; role: DelegatedTask['role']; output: unknown; sourceIds: string[]; inputTokens: number; outputTokens: number; costUsd: number; startedAt: Date; completedAt: Date }
export interface SharedBudget { maxSubAgentRuns: number; maxDepth: number; maxTokens: number; maxCostUsd: number; deadline: Date }
export interface OrchestrationPolicyPort { authorize(input: { workspaceId: string; role: OrchestrationRole; permissions: Permission[]; tools: string[]; dataScopes: string[] }): Promise<void> }
export interface SubAgentExecutionPort { execute(task: DelegatedTask, context: { workspaceId: string; userId: string; signal: AbortSignal; remainingTokens: number; remainingCostUsd: number }): Promise<SubAgentResult> }
export interface OrchestrationAuditPort { record(value: { workspaceId: string; workflow: OrchestrationWorkflow; status: string; results: SubAgentResult[]; totalTokens: number; totalCostUsd: number; latencyMs: number }): Promise<void> }
export const ORCHESTRATION_POLICY = Symbol('ORCHESTRATION_POLICY');
export const SUB_AGENT_EXECUTION = Symbol('SUB_AGENT_EXECUTION');
export const ORCHESTRATION_AUDIT = Symbol('ORCHESTRATION_AUDIT');
