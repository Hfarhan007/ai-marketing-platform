import { Injectable } from '@nestjs/common';
import { ExternalLeadIngestionService } from '../../../leads/services/external-lead-ingestion.service.js';
import type { IntegrationWebhookEvent } from '../../schemas/integration.schemas.js';
import { IntegrationRepository } from '../../repositories/integration.repository.js';
import { IntegrationService } from '../../services/integration.service.js';
import { MetaApiClient } from './meta-api.client.js';
import { mapMetaLead, metaLeadgenChange } from './meta-mappers.js';
import type { MetaLead, StoredMetaWebhookPayload } from './meta.types.js';

@Injectable()
export class MetaLeadsService {
  constructor(private readonly client:MetaApiClient,private readonly integrations:IntegrationService,private readonly repository:IntegrationRepository,private readonly ingestion:ExternalLeadIngestionService){}
  async process(event:IntegrationWebhookEvent){const workspaceId=String(event.workspaceId),connectionId=String(event.connectionId),context=await this.integrations.context(workspaceId,connectionId),connection=await this.repository.connection(workspaceId,connectionId),payload=event.payload as StoredMetaWebhookPayload,normalized=payload._normalizedLeadgen,change=normalized?{leadgenId:normalized.leadgenId,pageId:normalized.pageId,formId:normalized.formId,createdAt:new Date(normalized.createdAt)}:metaLeadgenChange(payload);if(!change)throw new Error('Meta leadgen event is malformed');if(!context.credentials.accessToken)throw new Error('Meta access token is unavailable');const token=(change.pageId?context.credentials.resourceTokens?.[change.pageId]:undefined)??context.credentials.accessToken;const lead=await this.client.request<MetaLead>(`${change.leadgenId}?fields=id,created_time,field_data,form_id,ad_id,adset_id,campaign_id`,token),mapped=mapMetaLead(lead);return this.ingestion.ingest({workspaceId,actorId:String(connection.createdBy),provider:connection.provider,externalLeadId:mapped.externalLeadId,firstName:mapped.firstName,lastName:mapped.lastName,fullName:mapped.fullName,email:mapped.email,phone:mapped.phone,company:mapped.company,source:connection.provider,...(lead.form_id?{formId:lead.form_id}:change.formId?{formId:change.formId}:{}),...(lead.ad_id?{adId:lead.ad_id}:{}),...(lead.adset_id?{adSetId:lead.adset_id}:{}),...(lead.campaign_id?{campaignId:lead.campaign_id}:{}),fields:mapped.fields,rawPayload:lead as unknown as Record<string,unknown>,receivedAt:lead.created_time?new Date(lead.created_time):change.createdAt,correlationId:String(event._id)});}
}
