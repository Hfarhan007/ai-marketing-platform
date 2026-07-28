import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventsModule } from '../../events/events.module.js';
import { CustomFieldsModule } from '../custom-fields/custom-fields.module.js';
import { CrmEventService } from './crm-event.service.js';
import { CRM_DATA_QUEUE, CrmJobsService } from './crm-jobs.service.js';
import {
  CrmAuditEvent,
  CrmAuditEventSchema,
  CrmDomainEvent,
  CrmDomainEventSchema,
} from './crm.schema.js';

@Module({
  imports: [
    CustomFieldsModule,
    MongooseModule.forFeature([
      { name: CrmAuditEvent.name, schema: CrmAuditEventSchema },
      { name: CrmDomainEvent.name, schema: CrmDomainEventSchema },
    ]),
    BullModule.registerQueue({ name: CRM_DATA_QUEUE }),
    EventsModule,
  ],
  providers: [CrmEventService, CrmJobsService],
  exports: [CrmEventService, CrmJobsService, CustomFieldsModule],
})
export class CrmModule {}
