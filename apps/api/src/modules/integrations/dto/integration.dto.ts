import{IsIn,IsInt,IsOptional,IsString,IsUrl,Max,MaxLength,Min}from'class-validator';import{PROVIDERS,type Provider}from'../types/provider-adapter.js';
export class CreateConnectionDto{@IsIn(PROVIDERS)provider!:Provider;@IsString()@MaxLength(200)name!:string}
export class BeginOAuthDto{@IsUrl({require_tld:false})redirectUri!:string}
export class OAuthCallbackDto{@IsString()state!:string;@IsString()code!:string}
export class SyncDto{@IsString()@MaxLength(100)resource!:string;@IsString()@MaxLength(200)idempotencyKey!:string;@IsOptional()@IsString()cursor?:string;@IsOptional()@IsInt()@Min(1)@Max(500)limit=100}
