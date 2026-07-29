import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CacheModule } from '../../cache/cache.module.js';
import { EventRedactor } from '../../events/event-redactor.service.js';
import {
  NotificationDeliveryProcessor,
  NotificationDigestScheduler,
} from './jobs/notification-delivery.processor.js';
import { NotificationRepository } from './repositories/notification.repository.js';
import {
  NotificationDefinition,
  NotificationDefinitionSchema,
  NotificationDeliveryAttempt,
  NotificationDeliveryAttemptSchema,
  NotificationDeliveryRequest,
  NotificationDeliveryRequestSchema,
  NotificationPreference,
  NotificationPreferenceSchema,
  NotificationSuppression,
  NotificationSuppressionSchema,
  NotificationTemplate,
  NotificationTemplateSchema,
} from './schemas/notification.schemas.js';
import {
  NOTIFICATION_DELIVERY_QUEUE,
  NotificationOrchestrator,
} from './services/notification-orchestrator.service.js';
import { QuietHoursService } from './services/quiet-hours.service.js';
@Module({
  imports: [
    CacheModule,
    BullModule.registerQueue({ name: NOTIFICATION_DELIVERY_QUEUE }),
    MongooseModule.forFeature([
      { name: NotificationDefinition.name, schema: NotificationDefinitionSchema },
      { name: NotificationPreference.name, schema: NotificationPreferenceSchema },
      { name: NotificationTemplate.name, schema: NotificationTemplateSchema },
      { name: NotificationDeliveryRequest.name, schema: NotificationDeliveryRequestSchema },
      { name: NotificationDeliveryAttempt.name, schema: NotificationDeliveryAttemptSchema },
      { name: NotificationSuppression.name, schema: NotificationSuppressionSchema },
    ]),
  ],
  providers: [
    EventRedactor,
    NotificationRepository,
    QuietHoursService,
    NotificationOrchestrator,
    NotificationDeliveryProcessor,
    NotificationDigestScheduler,
  ],
  exports: [NotificationOrchestrator],
})
export class NotificationsModule {}
