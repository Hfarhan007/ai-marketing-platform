import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { Types } from 'mongoose';
import type { PublishedDomainEvent } from '../../../events/outbox.processor.js';
import { EventRedactor } from '../../../events/event-redactor.service.js';
import { NotificationRepository } from '../repositories/notification.repository.js';
import type {
  NotificationDefinition,
  NotificationPreference,
} from '../schemas/notification.schemas.js';
import { QuietHoursService } from './quiet-hours.service.js';
export const NOTIFICATION_DELIVERY_QUEUE = 'notification-delivery';
const EVENT_DEFINITIONS: Record<string, string> = {
  'membership.invited': 'invitation',
  'auth.suspicious_login': 'password_security',
  'auth.password_reset': 'password_security',
  'task.reminder': 'task_reminder',
  'appointment.reminder': 'appointment_reminder',
  'conversation.assigned': 'assignment',
  'campaign.failed': 'campaign_failed',
  'workflow.failed': 'workflow_failure',
  'billing.subscription.started': 'billing_event',
  'billing.subscription.payment_failed': 'billing_event',
  'ai.escalation_requested': 'ai_escalation',
  'compliance.requested': 'compliance_request',
};
const DEFAULTS: Record<
  string,
  { channels: string[]; critical?: boolean; consentRequired?: boolean }
> = {
  invitation: { channels: ['in_app', 'email'] },
  password_security: { channels: ['in_app', 'email'], critical: true },
  task_reminder: { channels: ['in_app', 'email'] },
  appointment_reminder: { channels: ['in_app', 'email', 'sms'], consentRequired: true },
  assignment: { channels: ['in_app', 'email'] },
  campaign_failed: { channels: ['in_app', 'email'] },
  workflow_failure: { channels: ['in_app', 'email'] },
  billing_event: { channels: ['in_app', 'email'], critical: true },
  ai_escalation: { channels: ['in_app', 'email'] },
  compliance_request: { channels: ['in_app', 'email'], critical: true },
};
@Injectable()
export class NotificationOrchestrator {
  constructor(
    private readonly repository: NotificationRepository,
    private readonly quietHours: QuietHoursService,
    private readonly redactor: EventRedactor,
    @InjectQueue(NOTIFICATION_DELIVERY_QUEUE) private readonly queue: Queue,
  ) {}
  async consume(event: PublishedDomainEvent) {
    const key = EVENT_DEFINITIONS[event.eventType];
    if (!key) return { created: 0, ignored: true };
    const stored = await this.repository.definition(event.workspaceId, key);
    const fallback = DEFAULTS[key]!;
    const definition =
      stored ??
      ({
        key,
        channels: fallback.channels,
        deliveryMode: 'immediate',
        consentRequired: fallback.consentRequired ?? false,
        critical: fallback.critical ?? false,
        allowCriticalOverride: false,
        active: true,
      } as NotificationDefinition);
    const recipients = this.recipients(event.payload);
    let created = 0;
    for (const recipient of recipients) {
      const preference = recipient.userId
        ? await this.repository.preference(event.workspaceId, recipient.userId, key)
        : null;
      for (const channel of definition.channels) {
        const explicitCriticalOverride =
          definition.critical &&
          definition.allowCriticalOverride &&
          event.metadata.criticalOverride === true;
        if (!this.enabled(channel, preference, explicitCriticalOverride)) continue;
        const destination = recipient.destinations[channel];
        if (!destination) continue;
        if (
          definition.consentRequired &&
          channel !== 'in_app' &&
          !explicitCriticalOverride &&
          recipient.consent[channel] !== true
        )
          continue;
        if (
          !explicitCriticalOverride &&
          (await this.repository.suppressed(event.workspaceId, channel, destination, key))
        )
          continue;
        const locale = preference?.locale ?? recipient.locale ?? 'en';
        const template = await this.repository.template(event.workspaceId, key, channel, locale);
        const content = this.render(
          template?.subject ?? key.replaceAll('_', ' '),
          template?.body ?? `${key.replaceAll('_', ' ')} notification`,
          event.payload,
        );
        const quiet = explicitCriticalOverride
          ? { quiet: false, deliverAt: new Date() }
          : this.quietHours.evaluate(
              new Date(),
              preference?.timezone ?? recipient.timezone ?? 'UTC',
              preference?.quietHours ?? null,
            );
        const mode = preference?.deliveryMode ?? definition.deliveryMode;
        if (mode === 'disabled' && !explicitCriticalOverride) continue;
        const digest = mode === 'digest' && !explicitCriticalOverride;
        const result = await this.repository.reserve({
          workspaceId: new Types.ObjectId(event.workspaceId),
          definitionKey: key,
          channel,
          recipientUserId: recipient.userId ? new Types.ObjectId(recipient.userId) : null,
          destination,
          deduplicationKey: `${event.eventId}:${recipient.userId ?? destination}`,
          correlationId: event.correlationId,
          content,
          status: digest ? 'digest_pending' : quiet.quiet ? 'deferred' : 'queued',
          deliverAt: digest ? this.nextDigest(quiet.deliverAt) : quiet.deliverAt,
        });
        if (!result.duplicate && !digest) {
          const delay = Math.max(0, quiet.deliverAt.valueOf() - Date.now());
          await this.queue.add(
            'deliver',
            { workspaceId: event.workspaceId, requestId: String(result.value._id), channel },
            {
              jobId: `notification-${String(result.value._id)}`,
              delay,
              attempts: 6,
              backoff: { type: 'exponential', delay: 1000 },
            },
          );
          created += 1;
        }
      }
    }
    return { created, ignored: false };
  }
  private recipients(payload: Record<string, unknown>) {
    const raw = Array.isArray(payload.recipients) ? payload.recipients : [payload];
    return raw.slice(0, 100).flatMap((value) => {
      if (!value || typeof value !== 'object') return [];
      const item = value as Record<string, unknown>;
      const userId =
        typeof item.userId === 'string' && Types.ObjectId.isValid(item.userId)
          ? item.userId
          : undefined;
      const destinations: Record<string, string> = {};
      if (userId) destinations.in_app = userId;
      for (const channel of ['email', 'sms', 'whatsapp', 'push', 'webhook'])
        if (typeof item[channel] === 'string' && item[channel].length <= 500)
          destinations[channel] = item[channel];
      return [
        {
          userId,
          destinations,
          consent: this.record(item.consent),
          locale: typeof item.locale === 'string' ? item.locale : undefined,
          timezone: typeof item.timezone === 'string' ? item.timezone : undefined,
        },
      ];
    });
  }
  private enabled(
    channel: string,
    preference: NotificationPreference | null,
    explicitCriticalOverride: boolean,
  ) {
    if (explicitCriticalOverride) return true;
    return preference?.channels[channel] ?? true;
  }
  private render(subject: string, body: string, payload: Record<string, unknown>) {
    const safe = this.redactor.redact(payload) as Record<string, unknown>;
    const interpolate = (value: string) =>
      value.replace(/\{\{([a-zA-Z][a-zA-Z0-9_]*)\}\}/gu, (_, key: string) => {
        const item = safe[key];
        return typeof item === 'string' || typeof item === 'number'
          ? String(item).slice(0, 500)
          : '';
      });
    return {
      subject: interpolate(subject).slice(0, 300),
      body: interpolate(body).slice(0, 10_000),
    };
  }
  private record(value: unknown): Record<string, boolean> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).filter(
        ([, item]) => typeof item === 'boolean',
      ),
    ) as Record<string, boolean>;
  }
  private nextDigest(value: Date) {
    const next = new Date(value);
    next.setUTCMinutes(0, 0, 0);
    next.setUTCHours(next.getUTCHours() + 1);
    return next;
  }
}
