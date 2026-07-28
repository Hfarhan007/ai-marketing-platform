import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventAdminController } from './event-admin.controller.js';
import { EventRedactor } from './event-redactor.service.js';
import { InboxService } from './inbox.service.js';
import {
  DOMAIN_EVENTS_QUEUE,
  DomainEventConsumerProcessor,
  OUTBOX_PUBLISH_QUEUE,
  OutboxProcessor,
  OutboxScheduler,
} from './outbox.processor.js';
import { OutboxService } from './outbox.service.js';
import {
  EventProcessingFailure,
  EventProcessingFailureSchema,
  InboxEvent,
  InboxEventSchema,
  OutboxEvent,
  OutboxEventSchema,
} from './schemas/event-store.schemas.js';
@Module({
  imports: [
    BullModule.registerQueue({ name: OUTBOX_PUBLISH_QUEUE }, { name: DOMAIN_EVENTS_QUEUE }),
    MongooseModule.forFeature([
      { name: OutboxEvent.name, schema: OutboxEventSchema },
      { name: InboxEvent.name, schema: InboxEventSchema },
      { name: EventProcessingFailure.name, schema: EventProcessingFailureSchema },
    ]),
  ],
  controllers: [EventAdminController],
  providers: [
    EventRedactor,
    OutboxService,
    InboxService,
    OutboxProcessor,
    OutboxScheduler,
    DomainEventConsumerProcessor,
  ],
  exports: [OutboxService, InboxService],
})
export class EventsModule {}
