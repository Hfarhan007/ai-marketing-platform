import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { InboxService, OUTBOUND_MESSAGES_QUEUE } from '../services/inbox.service.js';
interface DeliveryJob {
  workspaceId: string;
  messageId: string;
  conversationId: string;
}
@Injectable()
@Processor(OUTBOUND_MESSAGES_QUEUE)
export class OutboundMessageProcessor extends WorkerHost {
  private readonly logger = new Logger(OutboundMessageProcessor.name);
  constructor(private readonly inbox: InboxService) {
    super();
  }
  async process(job: Job<DeliveryJob>): Promise<void> {
    await this.inbox.delivery(job.data.workspaceId, job.data.messageId, { state: 'sending' });
    try {
      // Provider adapters consume the persisted channel connection; secrets never enter the job payload.
      // Until an adapter acknowledges delivery, the optimistic message remains in "sending".
      this.logger.debug(
        { messageId: job.data.messageId, conversationId: job.data.conversationId },
        'Outbound delivery command accepted',
      );
    } catch (error: unknown) {
      await this.inbox.delivery(job.data.workspaceId, job.data.messageId, {
        state: 'failed',
        failureCode: 'provider_delivery_failed',
      });
      throw error;
    }
  }
}
