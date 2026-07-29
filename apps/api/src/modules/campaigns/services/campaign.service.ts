import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { Types } from 'mongoose';
import type { WorkspaceRequestContext } from '../../../common/types/workspace-context.js';
import { TransactionManagerService } from '../../../database/transactions/transaction-manager.service.js';
import { OutboxService } from '../../../events/outbox.service.js';
import { ContactsRepository } from '../../contacts/repositories/contacts.repository.js';
import { ConsentEvaluationService } from '../../consent/consent-evaluation.service.js';
import { purposeForCommunication } from '../../consent/consent.types.js';
import { assertTimeZone, parseInstant } from '../../scheduling/time.js';
import type {
  CreateCampaignDto,
  MetricDto,
  ScheduleCampaignDto,
  TestSendDto,
} from '../dto/campaign.dto.js';
import { ProviderAdapterRegistry } from '../providers/provider-adapter.js';
import { CampaignRepository } from '../repositories/campaign.repository.js';
import type { CampaignVersion } from '../schemas/campaign.schemas.js';
import type {
  CampaignChannel,
  CampaignVariant,
  RecipientSnapshot,
} from '../types/campaign.types.js';
import { CampaignPolicyService } from './campaign-policy.service.js';
export const CAMPAIGN_QUEUE = 'campaign-delivery';
@Injectable()
export class CampaignService {
  constructor(
    private readonly repository: CampaignRepository,
    private readonly contacts: ContactsRepository,
    private readonly policy: CampaignPolicyService,
    private readonly providers: ProviderAdapterRegistry,
    @InjectQueue(CAMPAIGN_QUEUE) private readonly queue: Queue,
    private readonly transactions: TransactionManagerService,
    private readonly outbox: OutboxService,
    private readonly consent: ConsentEvaluationService,
  ) {}
  create(c: WorkspaceRequestContext, d: CreateCampaignDto) {
    assertTimeZone(d.timezone);
    if (!d.variants.length) throw new BadRequestException('At least one variant is required');
    if (d.communicationType === 'transactional' && d.channel !== 'email')
      throw new BadRequestException('Only email supports the transactional consent purpose');
    return this.repository.create(
      c.workspaceId,
      c.userId,
      {
        name: d.name,
        channel: d.channel,
        audienceId: d.audienceId ? new Types.ObjectId(d.audienceId) : null,
        segmentId: d.segmentId ? new Types.ObjectId(d.segmentId) : null,
        timezone: d.timezone,
      },
      {
        variants: d.variants,
        personalizationDefaults: d.personalizationDefaults,
        quietHours: d.quietHours,
      },
    );
  }
  publish(c: WorkspaceRequestContext, id: string) {
    return this.repository.publish(c.workspaceId, id);
  }
  async schedule(c: WorkspaceRequestContext, id: string, d: ScheduleCampaignDto) {
    const campaign = await this.repository.campaign(c.workspaceId, id);
    if (campaign.approvalStatus !== 'approved')
      throw new BadRequestException('Campaign approval is required');
    const version =
      (await this.repository.draft(c.workspaceId, id)) ??
      (await this.repository.publish(c.workspaceId, id));
    const scheduledAt = parseInstant(d.scheduledAt);
    const snapshot = await this.snapshot(c.workspaceId, campaign, version, scheduledAt);
    const result = await this.transactions.run(async (session) => {
      const reserved = await this.repository.reserveRun(
        c.workspaceId,
        id,
        String(version._id),
        d.idempotencyKey,
        snapshot,
        session,
      );
      if (reserved.duplicate) return { reserved, deliveries: [] };
      const deliveries = await this.repository.createDeliveries(
        c.workspaceId,
        String(reserved.run._id),
        campaign.channel,
        campaign.communicationType,
        snapshot,
        session,
      );
      await this.outbox.append(
        {
          eventId: `campaign-schedule:${d.idempotencyKey}`,
          eventType: 'campaign.scheduled',
          aggregateType: 'campaignRun',
          aggregateId: String(reserved.run._id),
          workspaceId: c.workspaceId,
          payload: { campaignId: id, runId: String(reserved.run._id), scheduledAt },
          correlationId: d.idempotencyKey,
        },
        session,
      );
      return { reserved, deliveries };
    });
    const { reserved, deliveries } = result;
    if (reserved.duplicate)
      return {
        runId: String(reserved.run._id),
        duplicate: true,
        recipients: reserved.run.totalRecipients,
      };
    const batchSize = 100;
    for (let index = 0; index < deliveries.length; index += batchSize) {
      const batch = deliveries.slice(index, index + batchSize);
      await this.queue.add(
        'campaign.batch',
        {
          workspaceId: c.workspaceId,
          runId: String(reserved.run._id),
          deliveryIds: batch.map((value) => String(value._id)),
        },
        {
          jobId: `campaign-${String(reserved.run._id)}-batch-${index / batchSize}`,
          delay: Math.max(0, scheduledAt.valueOf() - Date.now()),
          attempts: 5,
          priority: 10,
          backoff: { type: 'exponential', delay: 1000 },
        },
      );
    }
    return { runId: String(reserved.run._id), duplicate: false, recipients: snapshot.length };
  }
  async testSend(c: WorkspaceRequestContext, id: string, d: TestSendDto) {
    const campaign = await this.repository.campaign(c.workspaceId, id),
      version = await this.repository.draft(c.workspaceId, id);
    if (!version) throw new NotFoundException('Campaign draft not found');
    const variant = (version.variants[0] ?? {}) as unknown as CampaignVariant;
    const content = this.policy.personalize(
      variant.content,
      d.personalization,
      version.personalizationDefaults,
    );
    return this.providers.send({
      channel: campaign.channel as CampaignChannel,
      address: d.address,
      subject: variant.subject,
      content,
      idempotencyKey: `test:${id}:${Date.now()}`,
    });
  }
  async command(c: WorkspaceRequestContext, runId: string, command: 'pause' | 'resume' | 'cancel') {
    const status = command === 'cancel' ? 'cancelled' : command === 'pause' ? 'paused' : 'running';
    const value = await this.repository.commandRun(c.workspaceId, runId, status);
    if (!value) throw new NotFoundException('Active campaign run not found');
    return value;
  }
  metric(c: WorkspaceRequestContext, runId: string, d: MetricDto) {
    return this.repository.metric(c.workspaceId, runId, d.eventType, d.conversionEventId);
  }
  private async snapshot(
    workspaceId: string,
    campaign: {
      channel: string;
      communicationType: string;
      audienceId: Types.ObjectId | null;
      segmentId: Types.ObjectId | null;
      timezone: string;
    },
    version: CampaignVersion,
    scheduledAt: Date,
  ) {
    let ids: string[] = [];
    let excluded: string[] = [];
    if (campaign.audienceId) {
      const audience = await this.repository.audience(workspaceId, String(campaign.audienceId));
      if (audience) {
        ids = audience.contactIds.map(String);
        excluded = audience.excludedContactIds.map(String);
      }
    } else if (campaign.segmentId) {
      const segment = await this.repository.segment(workspaceId, String(campaign.segmentId));
      if (segment) {
        const safeFilter = this.segmentFilter(segment.rules);
        const contacts = await this.contacts.findMany(workspaceId, {
          ...safeFilter,
          deletedAt: null,
        });
        ids = contacts.map((value) => String(value._id));
        excluded = segment.excludedContactIds.map(String);
      }
    }
    const contacts = await this.contacts.findMany(workspaceId, {
      _id: { $in: ids.filter((id) => !excluded.includes(id)).map((id) => new Types.ObjectId(id)) },
      deletedAt: null,
    });
    const candidates = contacts.flatMap((contact) => {
      const address =
        campaign.channel === 'email'
          ? contact.emailAddresses.find((p) => p.primary)?.normalized
          : contact.phoneNumbers.find((p) => p.primary)?.normalized;
      if (!address) return [];
      const region =
        typeof contact.customFields.region === 'string'
          ? contact.customFields.region.toUpperCase()
          : 'GLOBAL';
      return [{ contact, address, region }];
    });
    const purpose =
      campaign.channel === 'social'
        ? 'third_party_sharing'
        : purposeForCommunication(
            campaign.channel as 'email' | 'sms' | 'whatsapp',
            campaign.communicationType as 'transactional' | 'marketing',
          );
    const consented = (
      await Promise.all(
        candidates.map(async (candidate) => ({
          candidate,
          evaluation: await this.consent.evaluate({
            workspaceId,
            subjectId: String(candidate.contact._id),
            purpose,
            region: candidate.region,
          }),
        })),
      )
    )
      .filter(({ evaluation }) => evaluation.allowed)
      .map(({ candidate }) => candidate);
    const suppressed = new Set(
      await this.repository.suppressionAddresses(
        workspaceId,
        campaign.channel,
        consented.map((v) => v.address),
      ),
    );
    const variants = version.variants as unknown as CampaignVariant[],
      quiet = {
        startMinutes: Number(version.quietHours.startMinutes ?? 1320),
        endMinutes: Number(version.quietHours.endMinutes ?? 480),
      };
    return consented
      .filter((v) => !suppressed.has(v.address))
      .map(({ contact, address, region }): RecipientSnapshot => {
        const timezone =
          typeof contact.customFields.timezone === 'string'
            ? contact.customFields.timezone
            : campaign.timezone;
        const variant = this.policy.assignVariant(String(contact._id), variants);
        return {
          contactId: String(contact._id),
          address,
          timezone,
          variantId: variant.id,
          deliverAt: this.policy.nextDelivery(scheduledAt, timezone, quiet),
          region,
          personalization: {
            firstName: contact.firstName,
            lastName: contact.lastName,
            displayName: contact.displayName,
          },
        };
      });
  }
  private segmentFilter(rules: Record<string, unknown>[]) {
    const allowed = new Set(['source', 'lifecycleStatus', 'ownerId', 'tags']);
    const filter: Record<string, unknown> = {};
    for (const rule of rules) {
      const field = typeof rule.field === 'string' ? rule.field : '';
      if (!allowed.has(field)) throw new BadRequestException('Unsupported segment field');
      if (rule.operator === 'equals') filter[field] = rule.value;
      else if (rule.operator === 'contains') filter[field] = { $in: [rule.value] };
      else throw new BadRequestException('Unsupported segment operator');
    }
    return filter;
  }
}
