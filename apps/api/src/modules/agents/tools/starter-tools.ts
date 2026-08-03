import { z } from 'zod';
import type { AgentToolDefinition, AgentType, ToolRiskLevel } from './agent-tool.types.js';

export interface AgentToolPort {
  invoke(name: string, workspaceId: string, input: Record<string, unknown>, options?: { simulation: boolean }): Promise<unknown>;
}
const objectId = z.string().regex(/^[a-f\d]{24}$/iu);
const entity = z.object({ id: objectId, displayName: z.string(), summary: z.string().optional() }).strict();
const result = z.object({ status: z.string(), id: z.string().optional(), message: z.string().optional(), data: z.unknown().optional() }).strict();
const list = z.object({ items: z.array(entity), total: z.number().int().nonnegative() }).strict();
const all: AgentType[] = ['sales', 'support', 'marketing', 'scheduling', 'general'];

function tool<TInput extends z.ZodType, TOutput extends z.ZodType>(port: AgentToolPort, value: Omit<AgentToolDefinition<TInput, TOutput>, 'execute' | 'simulate'>): AgentToolDefinition<TInput, TOutput> {
  return { ...value, schema: value.inputSchema, permission: value.requiredPermissions[0]!, sensitive: value.approval !== 'never', execute: async (input, context) => value.outputSchema.parse(await port.invoke(value.name, context.workspaceId, input as Record<string, unknown>, { simulation: false })), simulate: async (input, context) => value.outputSchema.parse(await port.invoke(value.name, context.workspaceId, input as Record<string, unknown>, { simulation: true })) };
}
function base(name: string, description: string, risk: ToolRiskLevel, permission: AgentToolDefinition['requiredPermissions'], agentTypes: AgentType[] = all) {
  return { name, version: '1.0.0', description, requiredPermissions: permission, allowedAgentTypes: agentTypes, risk, idempotency: risk === 'read-only' ? 'none' as const : 'generated' as const, approval: ['sensitive write', 'external side effect', 'irreversible'].includes(risk) ? 'risk_based' as const : 'never' as const, timeoutMs: 5_000, rateLimit: { limit: risk === 'read-only' ? 60 : 20, windowMs: 60_000 }, audit: { arguments: true, result: true, redact: ['email', 'phone', 'content', 'notes'] } };
}

export function starterTools(port: AgentToolPort): AgentToolDefinition[] {
  return [
    tool(port, { ...base('contact_search', 'Search contacts in the current workspace', 'read-only', ['contacts.read']), inputSchema: z.object({ query: z.string().trim().min(1).max(200), limit: z.number().int().min(1).max(25).default(10) }).strict(), outputSchema: list }),
    tool(port, { ...base('contact_lookup', 'Look up one contact in the current workspace', 'read-only', ['contacts.read']), inputSchema: z.object({ contactId: objectId }).strict(), outputSchema: entity }),
    tool(port, { ...base('company_lookup', 'Look up one company in the current workspace', 'read-only', ['companies.read']), inputSchema: z.object({ companyId: objectId }).strict(), outputSchema: entity }),
    tool(port, { ...base('task_creation', 'Create a workspace task', 'low-risk write', ['tasks.manage']), inputSchema: z.object({ title: z.string().trim().min(1).max(200), dueAt: z.string().datetime().optional(), assigneeId: objectId.optional(), notes: z.string().max(5_000).optional() }).strict(), outputSchema: result }),
    tool(port, { ...base('task_update', 'Update explicitly allowlisted task fields', 'low-risk write', ['tasks.manage']), inputSchema: z.object({ taskId: objectId, title: z.string().trim().min(1).max(200).optional(), status: z.enum(['open', 'in_progress', 'completed', 'cancelled']).optional(), dueAt: z.string().datetime().nullable().optional() }).strict().refine((v) => Object.keys(v).length > 1, 'At least one update is required'), outputSchema: result }),
    tool(port, { ...base('lead_qualification', 'Apply a validated lead qualification transition', 'sensitive write', ['leads.update'], ['sales', 'general']), inputSchema: z.object({ leadId: objectId, qualification: z.enum(['unqualified', 'marketing_qualified', 'sales_qualified', 'disqualified']), reason: z.string().trim().min(3).max(500) }).strict(), outputSchema: result }),
    tool(port, { ...base('deal_lookup', 'Look up one deal in the current workspace', 'read-only', ['deals.read'], ['sales', 'general']), inputSchema: z.object({ dealId: objectId }).strict(), outputSchema: entity }),
    tool(port, { ...base('appointment_slot_lookup', 'Read available appointment slots', 'read-only', ['appointments.read'], ['sales', 'support', 'scheduling', 'general']), inputSchema: z.object({ serviceId: objectId, staffId: objectId.optional(), from: z.string().datetime(), to: z.string().datetime() }).strict().refine((v) => new Date(v.from) < new Date(v.to), 'Invalid time range'), outputSchema: z.object({ slots: z.array(z.object({ startAt: z.string().datetime(), endAt: z.string().datetime(), staffId: objectId }).strict()).max(100) }).strict() }),
    tool(port, { ...base('appointment_request', 'Request an appointment without bypassing booking policy', 'external side effect', ['appointments.manage'], ['sales', 'support', 'scheduling', 'general']), inputSchema: z.object({ serviceId: objectId, staffId: objectId, contactId: objectId, startAt: z.string().datetime(), endAt: z.string().datetime() }).strict().refine((v) => new Date(v.startAt) < new Date(v.endAt), 'Invalid appointment interval'), outputSchema: result }),
    tool(port, { ...base('knowledge_search', 'Search only permitted workspace knowledge collections', 'read-only', ['files.read']), inputSchema: z.object({ query: z.string().trim().min(1).max(1_000), collectionIds: z.array(objectId).min(1).max(20), limit: z.number().int().min(1).max(20).default(5) }).strict(), outputSchema: z.object({ items: z.array(z.object({ sourceId: objectId, title: z.string(), excerpt: z.string().max(2_000), score: z.number().min(0).max(1) }).strict()) }).strict() }),
    tool(port, { ...base('conversation_escalation', 'Escalate a conversation to a human queue', 'external side effect', ['inbox.manage'], ['support', 'sales', 'general']), inputSchema: z.object({ conversationId: objectId, reason: z.string().trim().min(3).max(500), priority: z.enum(['normal', 'high', 'urgent']).default('normal') }).strict(), outputSchema: result }),
    tool(port, { ...base('draft_message', 'Create a draft that can never send a message', 'low-risk write', ['inbox.reply'], ['support', 'sales', 'marketing', 'general']), inputSchema: z.object({ conversationId: objectId, content: z.string().trim().min(1).max(20_000) }).strict(), outputSchema: result }),
    tool(port, { ...base('campaign_performance_read', 'Read aggregate campaign performance', 'read-only', ['campaigns.read'], ['marketing', 'sales', 'general']), inputSchema: z.object({ campaignId: objectId, from: z.string().datetime().optional(), to: z.string().datetime().optional() }).strict(), outputSchema: z.object({ sent: z.number().int().nonnegative(), delivered: z.number().int().nonnegative(), opened: z.number().int().nonnegative(), clicked: z.number().int().nonnegative(), conversions: z.number().int().nonnegative() }).strict() }),
  ];
}
