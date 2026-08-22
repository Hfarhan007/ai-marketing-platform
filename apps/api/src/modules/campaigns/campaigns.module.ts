import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventsModule } from '../../events/events.module.js';
import { ContactsModule } from '../contacts/contacts.module.js';
import { ConsentModule } from '../consent/consent.module.js';
import { CampaignController } from './controllers/campaign.controller.js';
import { MetaCampaignController } from './controllers/meta-campaign.controller.js';
import { IntegrationsModule } from '../integrations/integrations.module.js';
import { FilesModule } from '../files/files.module.js';
import { MetaCampaignManagementService } from './services/meta-campaign-management.service.js';
import { CampaignDeliveryProcessor } from './jobs/campaign-delivery.processor.js';
import { ProviderAdapterRegistry } from './providers/provider-adapter.js';
import { CampaignRepository } from './repositories/campaign.repository.js';
import {
  Audience,
  AudienceSchema,
  Campaign,
  CampaignMetric,
  CampaignMetricSchema,
  CampaignRun,
  CampaignRunSchema,
  CampaignSchema,
  CampaignVersion,
  CampaignVersionSchema,
  Delivery,
  DeliverySchema,
  Segment,
  SegmentSchema,
  SuppressionEntry,
  SuppressionEntrySchema,
  UnsubscribeEvent,
  UnsubscribeEventSchema,
} from './schemas/campaign.schemas.js';
import { CampaignPolicyService } from './services/campaign-policy.service.js';
import { CAMPAIGN_QUEUE, CampaignService } from './services/campaign.service.js';
import { WorkflowsModule } from '../workflows/workflows.module.js';
@Module({
  imports: [
    ContactsModule,
    ConsentModule,
    EventsModule,
    IntegrationsModule,
    FilesModule,
    WorkflowsModule,
    BullModule.registerQueue({ name: CAMPAIGN_QUEUE }),
    MongooseModule.forFeature([
      { name: Campaign.name, schema: CampaignSchema },
      { name: CampaignVersion.name, schema: CampaignVersionSchema },
      { name: Audience.name, schema: AudienceSchema },
      { name: Segment.name, schema: SegmentSchema },
      { name: CampaignRun.name, schema: CampaignRunSchema },
      { name: Delivery.name, schema: DeliverySchema },
      { name: SuppressionEntry.name, schema: SuppressionEntrySchema },
      { name: UnsubscribeEvent.name, schema: UnsubscribeEventSchema },
      { name: CampaignMetric.name, schema: CampaignMetricSchema },
    ]),
  ],
  controllers: [CampaignController,MetaCampaignController],
  providers: [
    CampaignRepository,
    CampaignPolicyService,
    ProviderAdapterRegistry,
    CampaignService,
    CampaignDeliveryProcessor,
    MetaCampaignManagementService,
  ],
  exports: [CampaignService, ProviderAdapterRegistry],
})
export class CampaignsModule {}
