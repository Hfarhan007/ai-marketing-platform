import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ContactsModule } from '../contacts/contacts.module.js';
import { AiModule } from '../ai/ai.module.js';
import { CrmModule } from '../crm/crm.module.js';
import { DealsModule } from '../deals/deals.module.js';
import { LeadsController } from './controllers/leads.controller.js';
import { LeadsRepository } from './repositories/leads.repository.js';
import { Lead, LeadSchema } from './schemas/lead.schema.js';
import { LeadsService } from './services/leads.service.js';
import { LeadQualificationResult, LeadQualificationResultSchema } from './schemas/lead-qualification-result.schema.js';
import { LeadQualificationRepository } from './repositories/lead-qualification.repository.js';
import { LeadQualificationService } from './services/lead-qualification.service.js';
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Lead.name, schema: LeadSchema }, { name: LeadQualificationResult.name, schema: LeadQualificationResultSchema }]),
    AiModule,
    CrmModule,
    ContactsModule,
    DealsModule,
  ],
  controllers: [LeadsController],
  providers: [LeadsRepository, LeadsService, LeadQualificationRepository, LeadQualificationService],
})
export class LeadsModule {}
