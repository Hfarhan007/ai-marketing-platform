import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { ExternalLeadIngestionService } from '../../../leads/services/external-lead-ingestion.service.js';
import type { IntegrationWebhookEvent } from '../../schemas/integration.schemas.js';
import type { ProviderConnectionContext, WebhookEnvelope } from '../../types/provider-adapter.js';
import { mapHighLevelContact } from './highlevel-mappers.js';
import type { HighLevelContact } from './highlevel.types.js';

function scalar(value: unknown, fallback = ''): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : fallback;
}
@Injectable()
export class HighLevelWebhookService {
  constructor(private readonly ingestion: ExternalLeadIngestionService) {}
  envelopes(rawBody: Buffer): WebhookEnvelope[] {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody.toString('utf8')) as unknown;
    } catch {
      throw new BadRequestException({
        code: 'HIGHLEVEL_WEBHOOK_MALFORMED',
        message: 'Malformed HighLevel webhook payload',
        retryable: false,
      });
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
      throw new BadRequestException({
        code: 'HIGHLEVEL_WEBHOOK_MALFORMED',
        message: 'Malformed HighLevel webhook payload',
        retryable: false,
      });
    const payload = parsed as Record<string, unknown>,
      type = scalar(payload.type ?? payload.event, 'unknown'),
      objectId = scalar(payload.id ?? payload.contactId ?? payload.opportunityId ?? payload.appointmentId),
      timestamp = new Date(scalar(payload.timestamp ?? payload.dateAdded, String(Date.now())));
    const stable = scalar(
      payload.webhookId ?? payload.eventId,
      createHash('sha256').update(`${type}:${objectId}:${timestamp.toISOString()}`).digest('hex'),
    );
    return [
      {
        eventId: stable,
        eventType: type,
        timestamp: Number.isNaN(timestamp.valueOf()) ? new Date() : timestamp,
        payload,
      },
    ];
  }
  async process(event: IntegrationWebhookEvent, context: ProviderConnectionContext) {
    if (!this.isContact(event.eventType)) return;
    const payload = (
      typeof event.payload.contact === 'object' && event.payload.contact !== null
        ? event.payload.contact
        : event.payload
    ) as HighLevelContact;
    const id = payload.id ?? scalar(event.payload.contactId);
    if (!id) throw new Error('HighLevel contact webhook has no contact ID');
    await this.ingestion.ingest(mapHighLevelContact(context, { ...payload, id }));
  }
  private isContact(type: string) {
    return /contact/i.test(type) && !/(delete|dnd)/i.test(type);
  }
}
