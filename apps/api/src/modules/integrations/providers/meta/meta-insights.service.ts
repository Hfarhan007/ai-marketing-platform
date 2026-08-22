import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { createHash } from 'node:crypto';
import { REDIS_CLIENT } from '../../../../cache/redis.constants.js';
import type { ProviderConnectionContext, SyncRequest, SyncResult } from '../../types/provider-adapter.js';
import { MetaApiClient } from './meta-api.client.js';

export interface MetaInsightsQuery { since:string;until:string;level:'account'|'campaign'|'adset'|'ad';daily:boolean;limit:number;cursor?:string }
interface MetaAction { action_type?:string;value?:string }
interface RawInsight { date_start?:string;date_stop?:string;account_id?:string;campaign_id?:string;campaign_name?:string;adset_id?:string;adset_name?:string;ad_id?:string;ad_name?:string;spend?:string;impressions?:string;reach?:string;frequency?:string;clicks?:string;inline_link_clicks?:string;ctr?:string;cpc?:string;cpm?:string;actions?:MetaAction[];action_values?:MetaAction[];cost_per_action_type?:MetaAction[];purchase_roas?:MetaAction[] }
const FIELDS='date_start,date_stop,account_id,campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,spend,impressions,reach,frequency,clicks,inline_link_clicks,ctr,cpc,cpm,actions,action_values,cost_per_action_type,purchase_roas';
@Injectable()
export class MetaInsightsService {
  constructor(private readonly client:MetaApiClient,@Inject(REDIS_CLIENT)private readonly redis:Redis){}
  async report(context:ProviderConnectionContext,query:MetaInsightsQuery){
    const accountId=this.account(context),token=this.token(context),key=this.cacheKey(context,query),cached=await this.redis.get(key).catch(()=>null);
    if(cached)return{...(JSON.parse(cached)as Record<string,unknown>),cached:true};
    const timeRange=JSON.stringify({since:query.since,until:query.until}),path=`${accountId}/insights?fields=${FIELDS}&level=${query.level}&time_range=${encodeURIComponent(timeRange)}&time_increment=${query.daily?'1':'all_days'}&limit=${Math.min(query.limit,100)}${query.cursor?`&after=${encodeURIComponent(query.cursor)}`:''}`;
    const page=await this.client.pageResult<RawInsight>(path,token,query.limit),result={items:page.records.map((row)=>this.map(row)),...(page.nextCursor?{nextCursor:page.nextCursor}:{}),cached:false};
    await this.redis.set(key,JSON.stringify(result),'EX',300).catch(()=>undefined);
    return result;
  }
  async sync(context:ProviderConnectionContext,request:SyncRequest):Promise<SyncResult>{const now=new Date(),since=new Date(now.getTime()-30*86_400_000).toISOString().slice(0,10),value=await this.report(context,{since,until:now.toISOString().slice(0,10),level:'ad',daily:false,limit:request.limit,...(request.cursor?{cursor:request.cursor}:{})})as{items:Record<string,unknown>[];nextCursor?:string};return{records:value.items,...(value.nextCursor?{nextCursor:value.nextCursor}:{})};}
  private map(row:RawInsight){const spend=this.number(row.spend),leads=this.action(row.actions,['lead','onsite_conversion.lead_grouped','offsite_conversion.fb_pixel_lead']),conversions=this.action(row.actions,['offsite_conversion','purchase','offsite_conversion.fb_pixel_purchase']),purchaseValue=this.action(row.action_values,['purchase','offsite_conversion.fb_pixel_purchase']),costPerLead=leads>0?spend/leads:undefined,costPerConversion=conversions>0?spend/conversions:undefined,reportedRoas=this.action(row.purchase_roas,['purchase','omni_purchase','offsite_conversion.fb_pixel_purchase']),calculatedRoas=spend>0&&purchaseValue>0?purchaseValue/spend:undefined,roas=reportedRoas>0?reportedRoas:calculatedRoas;return{dateStart:row.date_start,dateStop:row.date_stop,accountId:row.account_id,campaignId:row.campaign_id,campaignName:row.campaign_name,adSetId:row.adset_id,adSetName:row.adset_name,adId:row.ad_id,adName:row.ad_name,spend,impressions:this.number(row.impressions),reach:this.number(row.reach),frequency:this.number(row.frequency),clicks:this.number(row.clicks),inlineLinkClicks:this.number(row.inline_link_clicks),ctr:this.number(row.ctr),cpc:this.number(row.cpc),cpm:this.number(row.cpm),leads,...(costPerLead===undefined?{}:{costPerLead}),conversions,...(costPerConversion===undefined?{}:{costPerConversion}),purchaseValue,...(roas===undefined?{}:{roas})};}
  private action(values:MetaAction[]|undefined,types:string[]){for(const type of types){const found=(values??[]).find((item)=>item.action_type===type);if(found)return this.number(found.value);}return 0;}
  private number(value:string|undefined){const parsed=Number(value??0);return Number.isFinite(parsed)?parsed:0;}
  private account(context:ProviderConnectionContext){const value=context.credentials.selectedResourceIds?.adAccounts?.[0];if(!value)throw new BadRequestException('Select a Meta ad account before requesting insights');return value;}
  private token(context:ProviderConnectionContext){if(!context.credentials.accessToken)throw new BadRequestException('Meta access token is unavailable');return context.credentials.accessToken;}
  private cacheKey(context:ProviderConnectionContext,query:MetaInsightsQuery){return`meta:insights:${context.workspaceId}:${context.connectionId}:${createHash('sha256').update(JSON.stringify(query)).digest('hex')}`;}
}
