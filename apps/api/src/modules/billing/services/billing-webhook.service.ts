import { BadRequestException, Injectable } from '@nestjs/common';
import { BillingProviderRegistry } from '../providers/billing.providers.js';
import { BillingRepository } from '../repositories/billing.repository.js';
import { BillingService } from './billing.service.js';
import type { BillingEvent } from './subscription-state-machine.js';

const EVENT_MAP: Record<string, BillingEvent | undefined> = {
  'invoice.payment_succeeded': 'payment_succeeded',
  'invoice.payment_failed': 'payment_failed',
  'customer.subscription.deleted': 'cancel',
  'customer.subscription.trial_will_end': 'trial_expired',
};
@Injectable()
export class BillingWebhookService {
  constructor(
    private readonly providers: BillingProviderRegistry,
    private readonly repo: BillingRepository,
    private readonly billing: BillingService,
  ) {}
  async receive(payload: Buffer, signature: string) {
    let event: { id: string; type: string; data: Record<string, unknown> };
    try {
      event = this.providers.get().verifyWebhook(payload, signature);
    } catch {
      throw new BadRequestException('Invalid billing webhook signature');
    }
    if (!(await this.repo.claimWebhook(event.id, event.type)))
      return { received: true, duplicate: true };
    try {
      const metadata = (event.data.metadata ?? {}) as Record<string, unknown>,
        workspaceId = metadata.workspaceId;
      const mapped = EVENT_MAP[event.type];
      if (mapped && typeof workspaceId === 'string')
        await this.billing.applyEvent(workspaceId, mapped);
      await this.repo.completeWebhook(event.id, 'processed');
      return { received: true, duplicate: false };
    } catch (error: unknown) {
      await this.repo.completeWebhook(
        event.id,
        'failed',
        error instanceof Error ? error.message : 'Unknown error',
      );
      throw error;
    }
  }
}
