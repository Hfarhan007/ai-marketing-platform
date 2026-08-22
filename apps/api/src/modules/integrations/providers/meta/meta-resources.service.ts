import { BadRequestException, Injectable } from '@nestjs/common';
import type { ProviderConnectionContext, ProviderResource, ProviderResourceSelection, ProviderSelectionResult } from '../../types/provider-adapter.js';
import { MetaApiClient } from './meta-api.client.js';

interface MetaResource { id: string; name?: string; username?: string; account_id?: string; access_token?: string; instagram_business_account?: { id: string; name?: string; username?: string } }

@Injectable()
export class MetaResourcesService {
  constructor(private readonly client: MetaApiClient) {}

  async discover(context: ProviderConnectionContext): Promise<ProviderResource[]> {
    const token = this.token(context), resources: ProviderResource[] = [];
    const identity = await this.client.request<MetaResource>('me?fields=id,name', token);
    resources.push({ type: 'identity', id: identity.id, name: identity.name ?? identity.id });
    const [pages, businesses, adAccounts] = await Promise.all([
      this.client.page<MetaResource>('me/accounts?fields=id,name,instagram_business_account{id,name,username}', token, 500),
      this.client.page<MetaResource>('me/businesses?fields=id,name', token, 500),
      this.client.page<MetaResource>('me/adaccounts?fields=id,name,account_id', token, 500),
    ]);
    for (const page of pages) {
      resources.push({ type: 'page', id: page.id, name: page.name ?? page.id });
      if (page.instagram_business_account) resources.push({ type: 'instagram_account', id: page.instagram_business_account.id, name: page.instagram_business_account.username ?? page.instagram_business_account.name ?? page.instagram_business_account.id, parentId: page.id });
    }
    resources.push(...businesses.map((item) => ({ type: 'business', id: item.id, name: item.name ?? item.id })));
    resources.push(...adAccounts.map((item) => ({ type: 'ad_account', id: item.id, name: item.name ?? item.account_id ?? item.id, ...(item.account_id ? { metadata: { accountId: item.account_id } } : {}) })));
    const pixels=await Promise.all(adAccounts.map(async(account)=>(await this.client.page<MetaResource>(`${account.id}/adspixels?fields=id,name`,token,100)).map((pixel)=>({type:'pixel',id:pixel.id,name:pixel.name??pixel.id,parentId:account.id}))));
    const forms = await Promise.all(pages.map(async (page) => (await this.client.page<MetaResource>(`${page.id}/leadgen_forms?fields=id,name`, token, 500)).map((form) => ({ type: 'lead_form', id: form.id, name: form.name ?? form.id, parentId: page.id }))));
    return [...resources, ...forms.flat(),...pixels.flat()];
  }

  async select(context: ProviderConnectionContext, selection: ProviderResourceSelection): Promise<ProviderSelectionResult> {
    const available = await this.discover(context), byType = new Map<string, Set<string>>();
    for (const resource of available) {
      if (!byType.has(resource.type)) byType.set(resource.type, new Set());
      byType.get(resource.type)?.add(resource.id);
    }
    this.assertAvailable('page', selection.pageIds, byType);
    this.assertAvailable('business', selection.businessIds, byType);
    this.assertAvailable('ad_account', selection.adAccountIds, byType);
    this.assertAvailable('instagram_account', selection.instagramAccountIds, byType);
    this.assertAvailable('lead_form', selection.formIds, byType);
    this.assertAvailable('pixel',selection.pixelIds,byType);
    const pageIds = selection.pageIds ?? [], resourceTokens: Record<string, string> = {};
    await Promise.all(pageIds.map(async (pageId) => {
      const page = await this.client.request<MetaResource>(`${pageId}?fields=id,access_token`, this.token(context));
      if (page.access_token) resourceTokens[pageId] = page.access_token;
    }));
    const selectedResourceIds = { pages: pageIds, businesses: selection.businessIds ?? [], adAccounts: selection.adAccountIds ?? [], instagramAccounts: selection.instagramAccountIds ?? [], forms: selection.formIds ?? [],pixels:selection.pixelIds??[] };
    const selected = available.filter((resource) => Object.values(selectedResourceIds).flat().includes(resource.id));
    return { credentials: { ...context.credentials, ...(pageIds[0] ? { accountId: pageIds[0] } : {}), resourceTokens: { ...(context.credentials.resourceTokens ?? {}), ...resourceTokens }, selectedResourceIds }, publicMetadata: { selectedResources: selected, selectedResourceIds } };
  }

  private token(context: ProviderConnectionContext) { if (!context.credentials.accessToken) throw new BadRequestException('Meta access token is unavailable'); return context.credentials.accessToken; }
  private assertAvailable(type: string, ids: string[] | undefined, available: Map<string, Set<string>>) { for (const id of ids ?? []) if (!available.get(type)?.has(id)) throw new BadRequestException(`Meta ${type} resource ${id} is not available to this connection`); }
}
