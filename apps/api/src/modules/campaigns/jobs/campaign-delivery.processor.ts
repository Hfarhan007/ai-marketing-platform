import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Job, Queue } from 'bullmq';
import { ProviderAdapterRegistry } from '../providers/provider-adapter.js';
import { CampaignRepository } from '../repositories/campaign.repository.js';
import { CAMPAIGN_QUEUE } from '../services/campaign.service.js';
import type { CampaignVariant } from '../types/campaign.types.js';
import { ConsentEvaluationService } from '../../consent/consent-evaluation.service.js';
import { purposeForCommunication } from '../../consent/consent.types.js';
interface BatchJob {
  workspaceId: string;
  runId: string;
  deliveryIds: string[];
}
@Injectable()
@Processor(CAMPAIGN_QUEUE, { concurrency: 20, limiter: { max: 100, duration: 1000 } })
export class CampaignDeliveryProcessor extends WorkerHost {
  constructor(
    private readonly repository: CampaignRepository,
    private readonly providers: ProviderAdapterRegistry,
    private readonly consent: ConsentEvaluationService,
    @InjectQueue(CAMPAIGN_QUEUE) private readonly queue: Queue,
  ) {
    super();
  }
  async process(job: Job<BatchJob>): Promise<void> {
    const run = await this.repository.run(job.data.workspaceId, job.data.runId);
    if (!run || ['cancelled', 'paused', 'completed'].includes(run.status)) return;
    const version = await this.repository.version(
      job.data.workspaceId,
      String(run.campaignVersionId),
    );
    if (!version) throw new Error('Campaign version missing');
    for (const id of job.data.deliveryIds) {
      const delivery = await this.repository.delivery(job.data.workspaceId, id);
      if (!delivery || delivery.status !== 'queued') continue;
      if (delivery.deliverAt.valueOf() > Date.now()) {
        await this.queue.add(
          'campaign.batch',
          { ...job.data, deliveryIds: [id] },
          {
            jobId: `delivery-${id}-${delivery.deliverAt.valueOf()}`,
            delay: delivery.deliverAt.valueOf() - Date.now(),
          },
        );
        continue;
      }
      const claimed = await this.repository.updateDelivery(
        job.data.workspaceId,
        id,
        { status: 'queued' },
        { $set: { status: 'sending' }, $inc: { attemptCount: 1 } },
      );
      if (!claimed) continue;
      const variant = version.variants.find(
        (value) => value.id === delivery.variantId,
      ) as unknown as CampaignVariant | undefined;
      if (!variant) {
        await this.repository.updateDelivery(
          job.data.workspaceId,
          id,
          {},
          { $set: { status: 'failed', failureCode: 'variant_missing' } },
        );
        continue;
      }
      const purpose =
        delivery.channel === 'social'
          ? 'third_party_sharing'
          : purposeForCommunication(
              delivery.channel as 'email' | 'sms' | 'whatsapp',
              delivery.communicationType as 'transactional' | 'marketing',
            );
      const evaluation = await this.consent.evaluate({
        workspaceId: job.data.workspaceId,
        subjectId: String(delivery.contactId),
        purpose,
        region: delivery.region,
      });
      if (!evaluation.allowed) {
        await this.repository.updateDelivery(
          job.data.workspaceId,
          id,
          { status: 'sending' },
          { $set: { status: 'suppressed', failureCode: `consent_${evaluation.reason}` } },
        );
        continue;
      }
      try {
        const result = await this.providers.send({
          channel: delivery.channel as 'email' | 'sms' | 'whatsapp' | 'social',
          address: delivery.address,
          ...(variant.subject ? { subject: variant.subject } : {}),
          content: variant.content,
          idempotencyKey: delivery.idempotencyKey,
        });
        await this.repository.updateDelivery(
          job.data.workspaceId,
          id,
          { status: 'sending' },
          {
            $set: {
              status: 'sent',
              providerMessageId: result.providerMessageId,
              failureCode: null,
            },
          },
        );
        await this.repository.metric(job.data.workspaceId, job.data.runId, 'sent');
      } catch (error: unknown) {
        await this.repository.updateDelivery(
          job.data.workspaceId,
          id,
          { status: 'sending' },
          {
            $set: {
              status: 'failed',
              failureCode: error instanceof Error ? error.name : 'provider_failure',
            },
          },
        );
        throw error;
      }
    }
  }
}
