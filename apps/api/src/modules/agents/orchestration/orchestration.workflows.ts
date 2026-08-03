import { z } from 'zod';
import type { DelegatedTask, OrchestrationWorkflow } from './orchestration.types.js';

const evidence = z.array(z.object({ sourceId: z.string().min(1), claim: z.string().min(1), confidence: z.number().min(0).max(1) }).strict()).min(1).max(30);
const schemas = {
  campaign: z.object({ findings: z.array(z.string()).max(20), anomalies: z.array(z.string()).max(20), evidence }).strict(),
  crm: z.object({ recommendation: z.enum(['qualify', 'do_not_qualify', 'human_review']), rationale: z.array(z.string()).max(20), evidence }).strict(),
  knowledge: z.object({ facts: z.array(z.string()).max(30), evidence }).strict(),
  support: z.object({ summary: z.string().max(5_000), openQuestions: z.array(z.string()).max(20), evidence }).strict(),
  compliance: z.object({ decision: z.enum(['approved', 'blocked', 'requires_changes', 'human_review']), issues: z.array(z.string()).max(30), evidence }).strict(),
};
export function workflowTasks(workflow: OrchestrationWorkflow, input: unknown): DelegatedTask[] {
  const task = (id: string, role: DelegatedTask['role'], objective: string, tools: string[], permissions: DelegatedTask['permissions'], dataScopes: string[], resultSchema: z.ZodType): DelegatedTask => ({ id, role, objective, input, tools, permissions, dataScopes, depth: 1, resultSchema });
  if (workflow === 'campaign_performance_investigation') return [task('campaign-analysis', 'campaign_analyst', 'Identify supported performance anomalies', ['campaign_performance_read'], ['campaigns.read'], ['campaign_metrics'], schemas.campaign), task('campaign-context', 'knowledge_researcher', 'Find relevant approved campaign guidance', ['knowledge_search'], ['files.read'], ['approved_knowledge'], schemas.knowledge)];
  if (workflow === 'lead_qualification_review') return [task('lead-analysis', 'crm_analyst', 'Review lead qualification using existing CRM evidence', ['contact_lookup', 'company_lookup', 'deal_lookup'], ['contacts.read', 'companies.read', 'deals.read', 'leads.read'], ['crm'], schemas.crm)];
  if (workflow === 'support_conversation_summary') return [task('support-summary', 'support_assistant', 'Summarize the supplied conversation without taking action', ['contact_lookup', 'knowledge_search'], ['contacts.read', 'files.read', 'inbox.read'], ['conversation', 'contact_summary'], schemas.support)];
  return [task('compliance-review', 'compliance_reviewer', 'Review the supplied message against approved compliance policy', ['knowledge_search'], ['files.read'], ['message_draft', 'compliance_policy'], schemas.compliance)];
}
