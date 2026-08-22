export type MetaAdsSection='overview'|'campaigns'|'ad-sets'|'ads'|'creatives'|'audiences'|'lead-forms'|'leads'|'analytics';
export interface MetaCampaign{id:string;name:string;status:string;providerStatus?:string;objective?:string;externalCampaignId?:string}
export interface MetaInsight{dateStart?:string;campaignId?:string;campaignName?:string;adSetId?:string;adSetName?:string;adId?:string;adName?:string;spend:number;impressions:number;reach:number;clicks:number;ctr:number;cpc:number;cpm:number;leads:number;costPerLead?:number;conversions:number;costPerConversion?:number;purchaseValue?:number;roas?:number}
export interface MetaRecord{id:string;name?:string;status?:string;effective_status?:string;[key:string]:unknown}
