import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CrmModule } from '../crm/crm.module.js';
import { DealsController } from './controllers/deals.controller.js';
import { DealsRepository } from './repositories/deals.repository.js';
import { Deal, DealSchema } from './schemas/deal.schema.js';
import { DealsService } from './services/deals.service.js';
import { WorkflowsModule } from '../workflows/workflows.module.js';
@Module({
  imports: [MongooseModule.forFeature([{ name: Deal.name, schema: DealSchema }]), CrmModule,WorkflowsModule],
  controllers: [DealsController],
  providers: [DealsRepository, DealsService],
  exports: [DealsRepository],
})
export class DealsModule {}
