export const PROVIDERS=['facebook','instagram','whatsapp','gmail','outlook','google_calendar','stripe','shopify','highlevel']as const;
export type Provider=(typeof PROVIDERS)[number];
export interface ProviderCredentials{accessToken?:string;refreshToken?:string;expiresAt?:string;apiKey?:string;accountId?:string;companyId?:string;locationId?:string;webhookSecret?:string;webhookPublicKey?:string;resourceTokens?:Record<string,string>;selectedResourceIds?:Record<string,string[]>}
export interface ProviderResource{type:string;id:string;name:string;parentId?:string;metadata?:Record<string,string|boolean>}
export interface ProviderResourceSelection{pageIds?:string[];businessIds?:string[];adAccountIds?:string[];instagramAccountIds?:string[];formIds?:string[];pixelIds?:string[];locationIds?:string[]}
export interface ProviderSelectionResult{credentials:ProviderCredentials;publicMetadata:Record<string,unknown>}
export interface ProviderConnectionContext{workspaceId:string;connectionId:string;provider:Provider;credentials:ProviderCredentials;actorId?:string}
export interface SyncRequest{resource:string;cursor?:string|undefined;limit:number}
export interface SyncResult{records:Record<string,unknown>[];nextCursor?:string;failures?:Array<{externalId?:string;code:string;message:string}>}
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
 handleWebhooks?(rawBody:Buffer,headers:Record<string,string|undefined>):Promise<WebhookEnvelope[]>;
 verifyWebhook(rawBody:Buffer,headers:Record<string,string|undefined>,secret:string,toleranceSeconds:number):boolean;
 healthCheck(context:ProviderConnectionContext):Promise<ProviderHealth>;
 authorizationUrl?(input:{state:string;redirectUri:string;codeChallenge?:string}):string;
 discoverResources?(context:ProviderConnectionContext):Promise<ProviderResource[]>;
 selectResources?(context:ProviderConnectionContext,selection:ProviderResourceSelection):Promise<ProviderSelectionResult>;
}
