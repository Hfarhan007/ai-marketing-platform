import { Injectable } from '@nestjs/common';
import { EventRedactor } from '../../events/event-redactor.service.js';
import type { PublishedDomainEvent } from '../../events/outbox.processor.js';
import { ActivityRepository } from './repositories/activity.repository.js';

type ActivityType =
  | 'contact_created'
  | 'note_added'
  | 'field_changed'
  | 'owner_changed'
  | 'task_created'
  | 'task_completed'
  | 'message_sent'
  | 'message_received'
  | 'email_opened'
  | 'campaign_interaction'
  | 'deal_moved'
  | 'deal_won'
  | 'deal_lost'
  | 'appointment_booked'
  | 'workflow_executed'
  | 'consent_changed'
  | 'file_attached'
  | 'ai_summary_generated';

const EXACT: Record<string, ActivityType> = {
  'contact.created': 'contact_created',
  'task.created': 'task_created',
  'task.completed': 'task_completed',
  'message.sent': 'message_sent',
  'message.received': 'message_received',
  'message.inbound': 'message_received',
  'message.outbound': 'message_sent',
  'deal.stage_changed': 'deal_moved',
  'deal.won': 'deal_won',
  'deal.lost': 'deal_lost',
  'appointment.booked': 'appointment_booked',
  'workflow.executed': 'workflow_executed',
  'workflow.completed': 'workflow_executed',
  'consent.changed': 'consent_changed',
  'file.attached': 'file_attached',
  'ai.summary_generated': 'ai_summary_generated',
  'email.opened': 'email_opened',
};

@Injectable()
export class ActivityProjectionService {
  constructor(
    private readonly repository: ActivityRepository,
    private readonly redactor: EventRedactor,
  ) {}
  async project(event: PublishedDomainEvent) {
    const type = this.mapType(event.eventType);
    if (!type) return { projected: false, reason: 'unsupported' };
    const payload = this.redactor.redact(event.payload) as Record<string, unknown>;
    const metadata = this.redactor.redact(event.metadata ?? {}) as Record<string, unknown>;
    const visibility = this.visibility(type, metadata);
    const actorId = typeof metadata.actorId === 'string' ? metadata.actorId : null;
    const inserted = await this.repository.insert({
      workspaceId: event.workspaceId,
      sourceEventId: event.eventId,
      type,
      sourceDomain: event.eventType.split('.')[0] ?? event.aggregateType,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      relatedEntities: this.related(payload),
      actorId,
      actorSnapshot: actorId ? { kind: 'user' } : { kind: 'system' },
      correlationId: event.correlationId,
      causationId: event.causationId ?? null,
      visibility,
      internalOnly: visibility === 'internal',
      requiredPermissions: this.permissions(event.aggregateType, visibility),
      data: this.data(type, payload),
      occurredAt: new Date(event.occurredAt),
      processedAt: new Date(),
      retainUntil: new Date(
        new Date(event.occurredAt).valueOf() +
          (visibility === 'internal' ? 365 : 7 * 365) * 86_400_000,
      ),
    });
    return { projected: inserted !== null, duplicate: inserted === null };
  }
  private mapType(eventType: string): ActivityType | null {
    if (EXACT[eventType]) return EXACT[eventType];
    if (eventType.endsWith('.note_added')) return 'note_added';
    if (eventType.endsWith('.field_changed') || eventType.endsWith('.updated'))
      return 'field_changed';
    if (eventType.endsWith('.owner_changed')) return 'owner_changed';
    if (eventType.startsWith('campaign.') || eventType.startsWith('delivery.'))
      return 'campaign_interaction';
    return null;
  }
  private visibility(type: ActivityType, metadata: Record<string, unknown>) {
    if (metadata.internalOnly === true || type === 'note_added') return 'internal';
    if (metadata.visibility === 'restricted') return 'restricted';
    return 'workspace';
  }
  private permissions(aggregateType: string, visibility: string) {
    if (visibility === 'internal') return ['admin.access'];
    const map: Record<string, string> = {
      contact: 'contacts.read',
      company: 'companies.read',
      lead: 'leads.read',
      deal: 'deals.read',
      task: 'tasks.read',
      appointment: 'appointments.read',
      message: 'inbox.read',
      conversation: 'inbox.read',
      campaign: 'campaigns.read',
      workflow: 'workflows.read',
      file: 'files.read',
    };
    return map[aggregateType] ? [map[aggregateType]] : [];
  }
  private related(payload: Record<string, unknown>) {
    const values: { type: string; id: string }[] = [];
    for (const [key, value] of Object.entries(payload)) {
      if (!key.endsWith('Id') || typeof value !== 'string' || value.length > 100) continue;
      values.push({ type: key.slice(0, -2), id: value });
      if (values.length === 20) break;
    }
    return values;
  }
  private data(type: ActivityType, payload: Record<string, unknown>) {
    if (type !== 'field_changed') return payload;
    const allowed: Record<string, unknown> = {};
    if (typeof payload.field === 'string') allowed.field = payload.field.slice(0, 100);
    if (
      typeof payload.from === 'string' ||
      typeof payload.from === 'number' ||
      typeof payload.from === 'boolean'
    )
      allowed.from = payload.from;
    if (
      typeof payload.to === 'string' ||
      typeof payload.to === 'number' ||
      typeof payload.to === 'boolean'
    )
      allowed.to = payload.to;
    return this.redactor.redact(allowed) as Record<string, unknown>;
  }
}
