export type IntegrationProvider = string;
export type IntegrationConnectionStatus = 'pending' | 'active' | 'error' | 'disabled'|'needs_attention';
export type IntegrationDisplayState = 'not_connected' | 'connecting' | 'connected' | 'needs_attention' | 'error' | 'reauthorize' | 'disconnected';
export interface IntegrationResource { type:string;id:string;name:string;parentId?:string;metadata?:Record<string,string|boolean> }
export interface IntegrationSubscriptionStatus { status:'subscribed'|'pending'|'error';pageIds?:string[];locationIds?:string[];callbackUrl:string;subscribedAt:string }
export interface SelectedIntegrationResources { pageIds?:string[];businessIds?:string[];adAccountIds?:string[];instagramAccountIds?:string[];formIds?:string[];pixelIds?:string[];locationIds?:string[] }
export interface IntegrationPublicMetadata { subscription?:IntegrationSubscriptionStatus;selectedResources?:IntegrationResource[];selectedResourceIds?:SelectedIntegrationResources;accountName?:string }
export interface IntegrationConnection { id:string;provider:IntegrationProvider;name:string;status:IntegrationConnectionStatus;publicMetadata:IntegrationPublicMetadata;lastValidatedAt:string|null;lastSyncAt:string|null;lastErrorCode:string|null;lastFailureMessage?:string|null;lastFailureAt?:string|null;createdAt?:string;updatedAt?:string }
export interface OAuthStart { authorizationUrl:string;state:string;codeChallenge?:string }
export interface ConnectionHealth { healthy:boolean;message?:string;checkedAt:string }
