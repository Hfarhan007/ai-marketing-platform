import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CacheModule } from '../../cache/cache.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { LeadsModule } from '../leads/leads.module.js';
import { IntegrationController } from './controllers/integration.controller.js';
import { IntegrationProcessor } from './jobs/integration.processor.js';
import { FacebookMetaProviderAdapter, InstagramMetaProviderAdapter, MetaAdsService, MetaApiClient, MetaConversionsService, MetaInsightsService, MetaLeadsService, MetaOAuthService, MetaResourcesService } from './providers/meta/index.js';
import { MetaWebhookController } from './providers/meta/meta-webhook.controller.js';
import { HighLevelApiClient,HighLevelCalendarService,HighLevelContactsService,HighLevelOAuthService,HighLevelOpportunitiesService,HighLevelPipelinesService,HighLevelProviderAdapter,HighLevelWebhookService } from './providers/highlevel/index.js';
import { ProviderRegistry } from './providers/provider.registry.js';
import { IntegrationRepository } from './repositories/integration.repository.js';
import { IntegrationConnection, IntegrationConnectionSchema, IntegrationConversionDelivery, IntegrationConversionDeliverySchema, IntegrationCredential, IntegrationCredentialSchema, IntegrationProviderHealth, IntegrationProviderHealthSchema, IntegrationSyncJob, IntegrationSyncJobSchema, IntegrationWebhookDelivery, IntegrationWebhookDeliverySchema, IntegrationWebhookEvent, IntegrationWebhookEventSchema } from './schemas/integration.schemas.js';
import { CredentialVaultService } from './services/credential-vault.service.js';
import { INTEGRATION_QUEUE, IntegrationService } from './services/integration.service.js';
import { OAuthService } from './services/oauth.service.js';
import { MetaConversionDeliveryService } from './services/meta-conversion-delivery.service.js';
@Module({
  imports: [AuthModule, CacheModule, LeadsModule, BullModule.registerQueue({ name: INTEGRATION_QUEUE }), MongooseModule.forFeature([{ name: IntegrationConnection.name, schema: IntegrationConnectionSchema }, { name: IntegrationCredential.name, schema: IntegrationCredentialSchema }, { name: IntegrationWebhookEvent.name, schema: IntegrationWebhookEventSchema }, { name: IntegrationWebhookDelivery.name, schema: IntegrationWebhookDeliverySchema }, { name: IntegrationSyncJob.name, schema: IntegrationSyncJobSchema }, { name: IntegrationProviderHealth.name, schema: IntegrationProviderHealthSchema },{name:IntegrationConversionDelivery.name,schema:IntegrationConversionDeliverySchema}])],
  controllers: [IntegrationController, MetaWebhookController],
  providers: [MetaApiClient, MetaOAuthService, MetaResourcesService, MetaAdsService, MetaInsightsService, MetaConversionsService, FacebookMetaProviderAdapter, InstagramMetaProviderAdapter, MetaLeadsService,HighLevelApiClient,HighLevelOAuthService,HighLevelContactsService,HighLevelOpportunitiesService,HighLevelPipelinesService,HighLevelCalendarService,HighLevelWebhookService,HighLevelProviderAdapter, ProviderRegistry, IntegrationRepository, CredentialVaultService, OAuthService, IntegrationService,MetaConversionDeliveryService, IntegrationProcessor],
  exports: [ProviderRegistry, IntegrationService,MetaAdsService,MetaInsightsService],
})
export class IntegrationsModule {}
