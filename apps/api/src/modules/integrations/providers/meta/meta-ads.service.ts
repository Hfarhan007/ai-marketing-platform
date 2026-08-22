import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  ProviderConnectionContext,
  SyncRequest,
  SyncResult,
} from '../../types/provider-adapter.js';
import { MetaApiClient } from './meta-api.client.js';

@Injectable()
export class MetaAdsService {
  constructor(private readonly client: MetaApiClient) {}
  async sync(context: ProviderConnectionContext, request: SyncRequest): Promise<SyncResult> {
    const token = this.token(context),
      accountId = context.credentials.selectedResourceIds?.adAccounts?.[0];
    if (!accountId) throw new BadRequestException('Select a Meta ad account before syncing ads');
    const fields: Record<string, string> = {
      campaigns: 'id,name,status,objective,created_time,updated_time',
      adsets: 'id,name,status,campaign_id,daily_budget,lifetime_budget,start_time,end_time',
      ads: 'id,name,status,adset_id,campaign_id,creative{id,name}',
    };
    const selectedFields = fields[request.resource];
    if (!selectedFields)
      throw new BadRequestException(`Unsupported Meta ads resource ${request.resource}`);
    const path = `${accountId}/${request.resource}?fields=${selectedFields}&limit=${Math.min(request.limit, 100)}${request.cursor ? `&after=${encodeURIComponent(request.cursor)}` : ''}`;
    const page = await this.client.pageResult<Record<string, unknown>>(path, token, request.limit);
    return { records: page.records, ...(page.nextCursor ? { nextCursor: page.nextCursor } : {}) };
  }
  listCampaigns(context: ProviderConnectionContext, limit = 100) {
    return this.client.page<Record<string, unknown>>(
      `${this.account(context)}/campaigns?fields=id,name,objective,status,effective_status,daily_budget,lifetime_budget,created_time,updated_time&limit=${limit}`,
      this.token(context),
      limit,
    );
  }
  getCampaign(context: ProviderConnectionContext, id: string) {
    return this.client.request<Record<string, unknown>>(
      `${id}?fields=id,name,objective,status,effective_status,daily_budget,lifetime_budget,created_time,updated_time`,
      this.token(context),
    );
  }
  createCampaign(
    context: ProviderConnectionContext,
    input: { name: string; objective: string; status: string; specialAdCategories: string[] },
  ) {
    return this.mutate(context, `${this.account(context)}/campaigns`, {
      name: input.name,
      objective: input.objective,
      status: input.status,
      special_ad_categories: input.specialAdCategories,
    });
  }
  updateCampaign(context: ProviderConnectionContext, id: string, input: Record<string, unknown>) {
    return this.mutate(context, id, input);
  }
  setStatus(
    context: ProviderConnectionContext,
    id: string,
    status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED',
  ) {
    return this.mutate(context, id, { status });
  }
  listAdSets(context: ProviderConnectionContext, campaignId?: string, limit = 100) {
    const root = campaignId ?? this.account(context);
    return this.client.page<Record<string, unknown>>(
      `${root}/adsets?fields=id,name,campaign_id,status,effective_status,daily_budget,lifetime_budget,optimization_goal,billing_event,targeting,start_time,end_time&limit=${limit}`,
      this.token(context),
      limit,
    );
  }
  createAdSet(context: ProviderConnectionContext, input: Record<string, unknown>) {
    return this.mutate(context, `${this.account(context)}/adsets`, input);
  }
  updateAdSet(context: ProviderConnectionContext, id: string, input: Record<string, unknown>) {
    return this.mutate(context, id, input);
  }
  listAds(context: ProviderConnectionContext, adSetId?: string, limit = 100) {
    const root = adSetId ?? this.account(context);
    return this.client.page<Record<string, unknown>>(
      `${root}/ads?fields=id,name,adset_id,campaign_id,status,effective_status,configured_status,creative{id,name,thumbnail_url},issues_info&limit=${limit}`,
      this.token(context),
      limit,
    );
  }
  getAd(context: ProviderConnectionContext, id: string) {
    return this.client.request<Record<string, unknown>>(
      `${id}?fields=id,name,adset_id,campaign_id,status,effective_status,configured_status,creative{id,name,thumbnail_url},issues_info`,
      this.token(context),
    );
  }
  createAd(context: ProviderConnectionContext, input: Record<string, unknown>) {
    return this.mutate(context, `${this.account(context)}/ads`, input);
  }
  updateAd(context: ProviderConnectionContext, id: string, input: Record<string, unknown>) {
    return this.mutate(context, id, input);
  }
  createImage(context: ProviderConnectionContext, url: string) {
    return this.mutate(context, `${this.account(context)}/adimages`, { url });
  }
  createVideo(context: ProviderConnectionContext, url: string, title: string) {
    return this.mutate(context, `${this.account(context)}/advideos`, { file_url: url, title });
  }
  createCreative(context: ProviderConnectionContext, input: Record<string, unknown>) {
    return this.mutate(context, `${this.account(context)}/adcreatives`, input);
  }
  listCustomAudiences(context: ProviderConnectionContext, limit = 100) {
    return this.client.page<Record<string, unknown>>(
      `${this.account(context)}/customaudiences?fields=id,name,subtype,approximate_count_lower_bound,approximate_count_upper_bound,delivery_status&limit=${limit}`,
      this.token(context),
      limit,
    );
  }
  listSavedAudiences(context: ProviderConnectionContext, limit = 100) {
    return this.client.page<Record<string, unknown>>(
      `${this.account(context)}/saved_audiences?fields=id,name,targeting&limit=${limit}`,
      this.token(context),
      limit,
    );
  }
  createCustomAudience(
    context: ProviderConnectionContext,
    input: { name: string; description?: string; customerFileSource: string },
  ) {
    return this.mutate(context, `${this.account(context)}/customaudiences`, {
      name: input.name,
      subtype: 'CUSTOM',
      customer_file_source: input.customerFileSource,
      ...(input.description ? { description: input.description } : {}),
    });
  }
  searchTargeting(context: ProviderConnectionContext, query: string, type = 'adinterest') {
    return this.client.page<Record<string, unknown>>(
      `search?type=${encodeURIComponent(type)}&q=${encodeURIComponent(query)}&limit=50`,
      this.token(context),
      50,
    );
  }
  createLookalike(
    context: ProviderConnectionContext,
    input: { name: string; sourceAudienceId: string; country: string; ratio: number },
  ) {
    return this.mutate(context, `${this.account(context)}/customaudiences`, {
      name: input.name,
      subtype: 'LOOKALIKE',
      origin_audience_id: input.sourceAudienceId,
      lookalike_spec: { type: 'similarity', country: input.country, ratio: input.ratio },
    });
  }
  private mutate(context: ProviderConnectionContext, path: string, input: Record<string, unknown>) {
    const body = new URLSearchParams();
    for (const [key, value] of Object.entries(input))
      if (value !== undefined) {
        const encoded =
          typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
            ? String(value)
            : JSON.stringify(value);
        body.set(key, encoded);
      }
    return this.client.request<Record<string, unknown>>(path, this.token(context), {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });
  }
  private account(context: ProviderConnectionContext) {
    const id = context.credentials.selectedResourceIds?.adAccounts?.[0];
    if (!id) throw new BadRequestException('Select a Meta ad account first');
    return id;
  }
  private token(context: ProviderConnectionContext) {
    if (!context.credentials.accessToken)
      throw new BadRequestException('Meta access token is unavailable');
    return context.credentials.accessToken;
  }
}
