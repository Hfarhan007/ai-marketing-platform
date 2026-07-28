import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { Job, Queue } from 'bullmq';
import { OutboxService } from './outbox.service.js';
import { InboxService, type ConsumedEvent } from './inbox.service.js';
export const OUTBOX_PUBLISH_QUEUE = 'outbox-publish';
export const DOMAIN_EVENTS_QUEUE = 'domain-events';
@Processor(OUTBOX_PUBLISH_QUEUE, { concurrency: 2 })
export class OutboxProcessor extends WorkerHost {
  private readonly logger = new Logger(OutboxProcessor.name);
  constructor(
    private readonly outbox: OutboxService,
    @InjectQueue(DOMAIN_EVENTS_QUEUE) private readonly events: Queue,
  ) {
    super();
  }
  async process(): Promise<{ published: number }> {
    let published = 0;
    for (let index = 0; index < 100; index += 1) {
      const event = await this.outbox.claim();
      if (!event) break;
      try {
        await this.events.add(
          event.eventType,
          {
            eventId: event.eventId,
            eventType: event.eventType,
            aggregateType: event.aggregateType,
            aggregateId: event.aggregateId,
            workspaceId: String(event.workspaceId),
            payload: event.payload,
            metadata: event.metadata,
            correlationId: event.correlationId,
            causationId: event.causationId,
            occurredAt: event.occurredAt.toISOString(),
          },
          {
            jobId: event.eventId,
            attempts: 8,
            backoff: { type: 'exponential', delay: 1000 },
            removeOnComplete: { age: 7 * 86_400 },
            removeOnFail: false,
          },
        );
        await this.outbox.processed(event.eventId);
        published += 1;
      } catch (error) {
        await this.outbox.failed(event.eventId, error, event.attempts);
        this.logger.error(
          { eventId: event.eventId, correlationId: event.correlationId, error },
          'outbox publication failed',
        );
      }
    }
    return { published };
  }
}
@Injectable()
export class OutboxScheduler implements OnModuleInit {
  constructor(@InjectQueue(OUTBOX_PUBLISH_QUEUE) private readonly queue: Queue) {}
  async onModuleInit() {
    await this.queue.upsertJobScheduler(
      'outbox-poll',
      { every: 5000 },
      { name: 'outbox.poll', data: {}, opts: { removeOnComplete: 100, removeOnFail: 1000 } },
    );
  }
}

interface PublishedDomainEvent extends ConsumedEvent {
  eventType: string;
  correlationId: string;
  causationId?: string;
}

@Processor(DOMAIN_EVENTS_QUEUE, { concurrency: 10 })
export class DomainEventConsumerProcessor extends WorkerHost {
  private readonly logger = new Logger(DomainEventConsumerProcessor.name);
  constructor(private readonly inbox: InboxService) {
    super();
  }
  process(job: Job<PublishedDomainEvent>) {
    return this.inbox.consume(`domain-event:${job.name}`, job.data, () => {
      this.logger.log(
        {
          eventId: job.data.eventId,
          eventType: job.data.eventType,
          workspaceId: job.data.workspaceId,
          correlationId: job.data.correlationId,
          causationId: job.data.causationId,
        },
        'domain integration event consumed',
      );
      return Promise.resolve({ accepted: true });
    });
  }
}
