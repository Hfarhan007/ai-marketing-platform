import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MongooseModule } from '@nestjs/mongoose';
import { ContactsModule } from '../contacts/contacts.module.js';
import { AiModule } from '../ai/ai.module.js';
import { CrmModule } from '../crm/crm.module.js';
import { DealsModule } from '../deals/deals.module.js';
import { WorkflowsModule } from '../workflows/workflows.module.js';
import { LeadsController } from './controllers/leads.controller.js';
import { LeadsRepository } from './repositories/leads.repository.js';
import { Lead, LeadSchema } from './schemas/lead.schema.js';
import { LeadsService } from './services/leads.service.js';
import { LeadQualificationResult, LeadQualificationResultSchema } from './schemas/lead-qualification-result.schema.js';
import { LeadQualificationRepository } from './repositories/lead-qualification.repository.js';
import { LeadQualificationService } from './services/lead-qualification.service.js';
import { ExternalLeadIngestionService, LEAD_AUTOMATION_QUEUE } from './services/external-lead-ingestion.service.js';
import { LeadAutomationProcessor } from './jobs/lead-automation.processor.js';
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Lead.name, schema: LeadSchema }, { name: LeadQualificationResult.name, schema: LeadQualificationResultSchema }]),
    AiModule,
    CrmModule,
    ContactsModule,
    DealsModule,
    WorkflowsModule,
    BullModule.registerQueue({ name: LEAD_AUTOMATION_QUEUE }),
  ],
  controllers: [LeadsController],
  providers: [LeadsRepository, LeadsService, LeadQualificationRepository, LeadQualificationService, ExternalLeadIngestionService, LeadAutomationProcessor],
  exports: [ExternalLeadIngestionService,WorkflowsModule],
})
export class LeadsModule {}
