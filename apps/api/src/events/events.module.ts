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
import { PermissionsModule } from '../modules/permissions/permissions.module.js';
import { Activity, ActivitySchema } from '../modules/activities/schemas/activity.schema.js';
import { ActivityRepository } from '../modules/activities/repositories/activity.repository.js';
import { ActivityProjectionService } from '../modules/activities/activity-projection.service.js';
import { ActivityService } from '../modules/activities/activity.service.js';
import { ActivityController } from '../modules/activities/activity.controller.js';
import { NotificationsModule } from '../modules/notifications/notifications.module.js';
@Module({
  imports: [
    PermissionsModule,
    NotificationsModule,
    BullModule.registerQueue({ name: OUTBOX_PUBLISH_QUEUE }, { name: DOMAIN_EVENTS_QUEUE }),
    MongooseModule.forFeature([
      { name: OutboxEvent.name, schema: OutboxEventSchema },
      { name: InboxEvent.name, schema: InboxEventSchema },
      { name: EventProcessingFailure.name, schema: EventProcessingFailureSchema },
      { name: Activity.name, schema: ActivitySchema },
    ]),
  ],
  controllers: [EventAdminController, ActivityController],
  providers: [
    EventRedactor,
    OutboxService,
    InboxService,
    OutboxProcessor,
    OutboxScheduler,
    DomainEventConsumerProcessor,
    ActivityRepository,
    ActivityProjectionService,
    ActivityService,
  ],
  exports: [OutboxService, InboxService],
})
export class EventsModule {}
