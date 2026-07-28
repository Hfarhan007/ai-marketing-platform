import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CrmEventService } from './crm-event.service.js';
import { CRM_DATA_QUEUE, CrmJobsService } from './crm-jobs.service.js';
import { CrmAuditEvent, CrmAuditEventSchema, CrmDomainEvent, CrmDomainEventSchema } from './crm.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CrmAuditEvent.name, schema: CrmAuditEventSchema },
      { name: CrmDomainEvent.name, schema: CrmDomainEventSchema },
    ]),
    BullModule.registerQueue({ name: CRM_DATA_QUEUE }),
  ],
  providers: [CrmEventService, CrmJobsService],
  exports: [CrmEventService, CrmJobsService],
})
export class CrmModule {}
