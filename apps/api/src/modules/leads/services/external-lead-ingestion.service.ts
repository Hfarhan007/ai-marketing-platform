import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { CrmEventService } from '../../crm/crm-event.service.js';
import { LeadsRepository } from '../repositories/leads.repository.js';
import type { Lead } from '../schemas/lead.schema.js';
import type { ExternalLeadIngestionResult, NormalizedExternalLead } from '../types/external-lead.types.js';

export const LEAD_AUTOMATION_QUEUE = 'lead-automation';

@Injectable()
export class ExternalLeadIngestionService {
  private readonly logger = new Logger(ExternalLeadIngestionService.name);

  constructor(
    private readonly leads: LeadsRepository,
    private readonly events: CrmEventService,
    @InjectQueue(LEAD_AUTOMATION_QUEUE) private readonly queue: Queue,
  ) {}

  async ingest(input: NormalizedExternalLead): Promise<ExternalLeadIngestionResult> {
    const email = input.email?.trim() ?? '';
    const phone = input.phone?.trim() ?? '';
    const normalizedEmail = email.toLowerCase();
    const normalizedPhone = phone.replace(/[^\d+]/gu, '');
    const metadata = this.metadata(input);
    let existing = await this.leads.findExternal(input.workspaceId, input.provider, input.externalLeadId);
    let duplicate = Boolean(existing);
    if (!existing) existing = await this.leads.findIdentity(input.workspaceId, normalizedEmail, normalizedPhone);

    let lead: Lead;
    let created = false;
    if (existing) {
      lead = await this.leads.updateEntity(input.workspaceId, String(existing._id), input.actorId, existing.version, {
        name: existing.name || this.name(input),
        email: existing.email || email,
        phone: existing.phone || phone,
        normalizedEmail: existing.normalizedEmail || normalizedEmail,
        normalizedPhone: existing.normalizedPhone || normalizedPhone,
        source: existing.source === 'manual' ? input.source : existing.source,
        externalProvider: existing.externalProvider ?? input.provider,
        externalLeadId: existing.externalLeadId ?? input.externalLeadId,
        providerMetadata: { ...(existing.providerMetadata ?? {}), ...metadata },
        rawProviderPayload: input.rawPayload,
        externallyReceivedAt: input.receivedAt,
      });
    } else {
      try {
        lead = await this.leads.createEntity(input.workspaceId, input.actorId, {
          name: this.name(input), email, phone, normalizedEmail, normalizedPhone,
          source: input.source, status: 'new', qualification: 'unqualified', score: 0,
          externalProvider: input.provider, externalLeadId: input.externalLeadId,
          providerMetadata: metadata, rawProviderPayload: input.rawPayload,
          externallyReceivedAt: input.receivedAt, customFields: {}, tags: [],
        });
        created = true;
      } catch (error: unknown) {
        if (!isDuplicateKeyError(error)) throw error;
        const raced = await this.leads.findExternal(input.workspaceId, input.provider, input.externalLeadId);
        if (!raced) throw error;
        lead = raced;
        duplicate = true;
      }
    }

    await this.events.record({
      workspaceId: input.workspaceId, actorId: input.actorId, entityType: 'lead', entityId: String(lead._id),
      action: created ? 'created' : 'updated', ...(input.correlationId ? { correlationId: input.correlationId } : {}),
      metadata: { provider: input.provider, externalLeadId: input.externalLeadId, source: input.source, external: true },
    });
    let qualificationQueued = false;
    const stableId = `${input.workspaceId}-${input.provider}-${input.externalLeadId}`.replace(/[^a-zA-Z0-9_-]/gu, '-');
    const automationJobs = [
      this.queue.add('lead.workflow', {
        workspaceId: input.workspaceId, actorId: input.actorId, leadId: String(lead._id),
        provider: input.provider, externalLeadId: input.externalLeadId,
        source: input.source, correlationId: input.correlationId,eventType:created?'lead.created':'lead.updated',campaignId:input.campaignId,campaignName:input.campaignName,adSetId:input.adSetId,adSetName:input.adSetName,adId:input.adId,adName:input.adName,formId:input.formId,formName:input.formName,
      }, { jobId: `workflow-${stableId}-${created?'created':(input.correlationId??'updated').replace(/[^a-zA-Z0-9_-]/gu,'-')}`, attempts: 5, backoff: { type: 'exponential', delay: 2_000 }, removeOnComplete: 1_000 }),
    ];
    if (created) {
      automationJobs.push(
        this.queue.add('lead.qualify', {
          workspaceId: input.workspaceId, actorId: input.actorId, leadId: String(lead._id),
          text: this.qualificationText(input), correlationId: input.correlationId,
          provider: input.provider, externalLeadId: input.externalLeadId, source: input.source,campaignId:input.campaignId,campaignName:input.campaignName,adSetId:input.adSetId,adSetName:input.adSetName,adId:input.adId,adName:input.adName,formId:input.formId,formName:input.formName,
        }, { jobId: `qualify-${stableId}`, attempts: 3, backoff: { type: 'exponential', delay: 2_000 }, removeOnComplete: 1_000 }),
      );
      qualificationQueued = true;
    }
    await Promise.all(automationJobs);
    this.logger.log({ workspaceId: input.workspaceId, provider: input.provider, leadId: String(lead._id), created, duplicate }, 'External lead ingested');
    return { leadId: String(lead._id), created, duplicate, qualificationQueued };
  }

  private name(input: NormalizedExternalLead) {
    return input.fullName?.trim() || [input.firstName, input.lastName].filter(Boolean).join(' ').trim() || input.email?.trim() || input.phone?.trim() || 'External lead';
  }
  private metadata(input: NormalizedExternalLead): Record<string, unknown> {
    return { provider: input.provider, externalLeadId: input.externalLeadId, company: input.company ?? '', campaignId: input.campaignId ?? '', campaignName: input.campaignName ?? '', adSetId: input.adSetId ?? '', adSetName: input.adSetName ?? '', adId: input.adId ?? '', adName: input.adName ?? '', formId: input.formId ?? '', formName: input.formName ?? '', fields: input.fields ?? {}, receivedAt: input.receivedAt.toISOString() };
  }
  private qualificationText(input: NormalizedExternalLead) {
    return [this.name(input), input.company, input.source, input.campaignName, input.formName, ...Object.values(input.fields ?? {}).filter((value): value is string => typeof value === 'string')].filter(Boolean).join('\n').slice(0, 20_000);
  }
}

function isDuplicateKeyError(error: unknown): error is { code: 11000 } {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}
