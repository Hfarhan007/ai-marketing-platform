export const PROVIDERS=['facebook','instagram','whatsapp','gmail','outlook','google_calendar','stripe','shopify','highlevel']as const;
export type Provider=(typeof PROVIDERS)[number];
export interface ProviderCredentials{accessToken?:string;refreshToken?:string;expiresAt?:string;apiKey?:string;accountId?:string;webhookSecret?:string}
export interface ProviderConnectionContext{workspaceId:string;connectionId:string;provider:Provider;credentials:ProviderCredentials}
export interface SyncRequest{resource:string;cursor?:string|undefined;limit:number}
export interface SyncResult{records:Record<string,unknown>[];nextCursor?:string}
export interface WebhookEnvelope{eventId:string;eventType:string;timestamp:Date;payload:Record<string,unknown>}
export interface ProviderHealth{healthy:boolean;message?:string;checkedAt:Date}
export interface IntegrationProviderAdapter{
 readonly provider:Provider;
 connect(input:Record<string,string>):Promise<ProviderCredentials>;
 disconnect(context:ProviderConnectionContext):Promise<void>;
 refreshCredentials(context:ProviderConnectionContext):Promise<ProviderCredentials>;
 validateConnection(context:ProviderConnectionContext):Promise<boolean>;
 sync(context:ProviderConnectionContext,request:SyncRequest):Promise<SyncResult>;
 subscribeWebhooks(context:ProviderConnectionContext,callbackUrl:string):Promise<void>;
 handleWebhook(rawBody:Buffer,headers:Record<string,string|undefined>):Promise<WebhookEnvelope>;
 verifyWebhook(rawBody:Buffer,headers:Record<string,string|undefined>,secret:string,toleranceSeconds:number):boolean;
 healthCheck(context:ProviderConnectionContext):Promise<ProviderHealth>;
}
