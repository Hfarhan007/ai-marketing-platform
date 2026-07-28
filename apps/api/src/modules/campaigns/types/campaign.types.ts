export type CampaignChannel='email'|'sms'|'whatsapp'|'social';
export interface RecipientSnapshot{contactId:string;address:string;timezone:string;personalization:Record<string,string>;variantId:string;deliverAt:Date}
export interface CampaignVariant{id:string;weight:number;subject?:string;content:string}
export interface ProviderDeliveryCommand{channel:CampaignChannel;address:string;subject?:string|undefined;content:string;idempotencyKey:string}
export interface ProviderDeliveryResult{providerMessageId:string}
