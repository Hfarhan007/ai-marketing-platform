import { z } from 'zod';
import type { AgentToolDefinition } from './agent-tool.types.js';

export interface AgentToolPort {
  invoke(name: string, workspaceId: string, input: Record<string, unknown>): Promise<unknown>;
}
const definition = <T extends z.ZodType>(
  port: AgentToolPort,
  value: Omit<AgentToolDefinition<T>, 'execute'>,
): AgentToolDefinition<T> => ({
  ...value,
  execute: (input, context) => port.invoke(value.name, context.workspaceId, input as Record<string, unknown>),
});
export function starterTools(port: AgentToolPort): AgentToolDefinition[] {
  return [
    definition(port, { name: 'search_contacts', description: 'Search tenant contacts', schema: z.object({ query: z.string().min(1).max(200), limit: z.number().int().min(1).max(25).default(10) }), permission: 'contacts.read', sensitive: false, timeoutMs: 3_000 }),
    definition(port, { name: 'read_contact', description: 'Read one tenant contact', schema: z.object({ contactId: z.string().regex(/^[a-f\d]{24}$/iu) }), permission: 'contacts.read', sensitive: false, timeoutMs: 3_000 }),
    definition(port, { name: 'create_task', description: 'Create a tenant task', schema: z.object({ title: z.string().min(1).max(200), dueAt: z.string().datetime().optional() }), permission: 'tasks.manage', sensitive: true, timeoutMs: 5_000 }),
    definition(port, { name: 'update_lead_status', description: 'Update a lead using allowed lifecycle transitions', schema: z.object({ leadId: z.string().regex(/^[a-f\d]{24}$/iu), status: z.enum(['new', 'contacted', 'qualified', 'unqualified']) }), permission: 'leads.update', sensitive: true, timeoutMs: 5_000 }),
    definition(port, { name: 'search_knowledge', description: 'Search permitted knowledge collections', schema: z.object({ query: z.string().min(1).max(1_000), collectionIds: z.array(z.string()).max(20), limit: z.number().int().min(1).max(20).default(5) }), permission: 'files.read', sensitive: false, timeoutMs: 10_000 }),
    definition(port, { name: 'book_appointment', description: 'Prepare an appointment booking for approval', schema: z.object({ staffId: z.string(), startAt: z.string().datetime(), endAt: z.string().datetime() }), permission: 'appointments.manage', sensitive: true, timeoutMs: 5_000 }),
    definition(port, { name: 'escalate_to_human', description: 'Hand the conversation to a human', schema: z.object({ reason: z.string().min(1).max(500), priority: z.enum(['normal', 'high', 'urgent']).default('normal') }), permission: 'inbox.manage', sensitive: false, timeoutMs: 3_000 }),
    definition(port, { name: 'draft_reply', description: 'Draft but never send a reply', schema: z.object({ conversationId: z.string(), content: z.string().min(1).max(20_000) }), permission: 'inbox.reply', sensitive: false, timeoutMs: 3_000 }),
  ];
}
