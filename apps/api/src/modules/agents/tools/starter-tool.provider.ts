import { Injectable, NotImplementedException } from '@nestjs/common';
import type { AgentToolPort } from './starter-tools.js';

type Handler = (workspaceId: string, input: Readonly<Record<string, unknown>>) => Promise<unknown>;

/**
 * Explicit cross-domain port. Domain modules register named handlers; there is
 * deliberately no generic URL, database, shell, or code execution adapter.
 */
@Injectable()
export class StarterToolProvider implements AgentToolPort {
  private readonly handlers = new Map<string, Handler>();
  register(name: string, handler: Handler) {
    if (this.handlers.has(name)) throw new Error(`Duplicate tool adapter ${name}`);
    this.handlers.set(name, handler);
  }
  invoke(name: string, workspaceId: string, input: Record<string, unknown>, options?: { simulation: boolean }): Promise<unknown> {
    if (options?.simulation) return Promise.resolve(this.preview(name, input));
    const handler = this.handlers.get(name);
    if (!handler) throw new NotImplementedException(`Tool adapter is not configured: ${name}`);
    return handler(workspaceId, Object.freeze(structuredClone(input)));
  }
  private preview(name: string, input: Record<string, unknown>): unknown {
    if (name === 'task_creation' || name === 'task_update' || name === 'lead_qualification' || name === 'appointment_request' || name === 'conversation_escalation' || name === 'draft_message') return { status: 'simulated', message: 'No side effect was performed', data: input };
    if (name === 'contact_search') return { items: [], total: 0 };
    if (name.endsWith('_lookup')) return { id: String(input.contactId ?? input.companyId ?? input.dealId), displayName: 'Simulation' };
    if (name === 'appointment_slot_lookup') return { slots: [] };
    if (name === 'knowledge_search') return { items: [] };
    if (name === 'campaign_performance_read') return { sent: 0, delivered: 0, opened: 0, clicked: 0, conversions: 0 };
    throw new NotImplementedException(`Simulation is not configured: ${name}`);
  }
}
