import { BadRequestException,ServiceUnavailableException,UnauthorizedException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { afterEach,describe,expect,it,vi } from 'vitest';
import { MetaApiClient } from './meta-api.client.js';
import { MetaConversionsService } from './meta-conversions.service.js';
import { MetaInsightsService } from './meta-insights.service.js';
import { MetaOAuthService } from './meta-oauth.service.js';

const jsonResponse=(body:unknown,status=200,headers:Record<string,string>={})=>({ok:status>=200&&status<300,status,headers:new Headers(headers),json:vi.fn().mockResolvedValue(body)}) as unknown as Response;
const context={workspaceId:'workspace-a',connectionId:'connection-a',provider:'facebook',credentials:{accessToken:'secret-token',selectedResourceIds:{adAccounts:['act_1'],pixels:['pixel-1']}}} as never;

describe('MetaApiClient',()=>{
 afterEach(()=>vi.unstubAllGlobals());
 it('maps expired credentials without exposing the token',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(jsonResponse({error:{code:190,message:'token secret-token expired'}},401)));const client=new MetaApiClient({get:()=> 'v23.0'} as never);await expect(client.request('me','secret-token')).rejects.toThrow(UnauthorizedException);await expect(client.request('me','secret-token')).rejects.not.toThrow('secret-token');});
 it('follows pagination and honors the requested record limit',async()=>{const client=new MetaApiClient({get:()=> 'v23.0'} as never);vi.spyOn(client,'request').mockResolvedValueOnce({data:[1,2],paging:{next:'https://next'}}).mockResolvedValueOnce({data:[3,4]});await expect(client.page<number>('items','token',3)).resolves.toEqual([1,2,3]);expect(client.request).toHaveBeenCalledTimes(2);});
 it('maps a persistent rate limit to a retryable service error',async()=>{vi.useFakeTimers();vi.stubGlobal('fetch',vi.fn().mockResolvedValue(jsonResponse({error:{code:613,message:'limit'}},429)));const promise=new MetaApiClient({get:()=> 'v23.0'} as never).request('me','token');await vi.runAllTimersAsync();await expect(promise).rejects.toThrow(ServiceUnavailableException);vi.useRealTimers();});
});

describe('Meta OAuth and reporting',()=>{
 it('rejects an expired token during validation',async()=>{const client={request:vi.fn().mockResolvedValue({data:{app_id:'app',is_valid:true,expires_at:1}})},config={get:(key:string)=>key.endsWith('appId')?'app':key.endsWith('appSecret')?'secret':undefined};await expect(new MetaOAuthService(client as never,config as never).validate('token')).rejects.toMatchObject({code:'META_TOKEN_EXPIRED'});});
 it('maps insights, derives CPL/CPA/ROAS, scopes cache keys, and omits invalid ROAS',async()=>{const api={pageResult:vi.fn().mockResolvedValue({records:[{spend:'100',impressions:'1000',reach:'800',clicks:'50',actions:[{action_type:'lead',value:'10'},{action_type:'purchase',value:'2'}],action_values:[{action_type:'purchase',value:'400'}]},{spend:'0',actions:[]}],nextCursor:'next'})},redis={get:vi.fn().mockResolvedValue(null),set:vi.fn().mockResolvedValue('OK')},service=new MetaInsightsService(api as never,redis as never),result=await service.report(context,{since:'2026-01-01',until:'2026-01-31',level:'campaign',daily:true,limit:25});expect(result.items[0]).toMatchObject({spend:100,leads:10,costPerLead:10,conversions:2,costPerConversion:50,roas:4});expect(result.items[1]).not.toHaveProperty('roas');expect(redis.set.mock.calls[0][0]).toContain('workspace-a:connection-a:');expect(api.pageResult.mock.calls[0][0]).toContain('limit=25');});
});

describe('Meta Conversions API',()=>{
 it('normalizes and hashes PII while retaining only transport identifiers in clear text',()=>{const prepared=new MetaConversionsService({} as never).prepare({eventName:'Lead',eventTime:new Date('2026-01-01T00:00:00Z'),eventId:'lead-1',actionSource:'website',customer:{email:' ADA@Example.COM ',phone:'+1 (555) 123-4567',clientIpAddress:'127.0.0.1'}});expect(prepared.user_data.em).toEqual([createHash('sha256').update('ada@example.com').digest('hex')]);expect(prepared.user_data.ph).toEqual([createHash('sha256').update('15551234567').digest('hex')]);expect(JSON.stringify(prepared)).not.toContain('ADA@Example.COM');});
  it('uses the stable caller event_id for browser/server deduplication',()=>{const service=new MetaConversionsService({} as never),input={eventName:'Purchase',eventTime:new Date('2026-01-01'),eventId:'order-42',actionSource:'website' as const,customer:{externalId:'contact-7'}};expect(service.prepare(input).event_id).toBe(service.prepare(input).event_id);});
  it('does not write unhashed PII to application logs',()=>{const error=vi.spyOn(console,'error').mockImplementation(()=>undefined),warn=vi.spyOn(console,'warn').mockImplementation(()=>undefined);new MetaConversionsService({} as never).prepare({eventName:'Lead',eventTime:new Date(),eventId:'lead-2',actionSource:'system_generated',customer:{email:'private@example.com'}});expect(error).not.toHaveBeenCalled();expect(warn).not.toHaveBeenCalled();});
 it('refuses to send to an unselected pixel',()=>{expect(()=>new MetaConversionsService({request:vi.fn()} as never).send(context,'other-pixel',{} as never)).toThrow(BadRequestException);});
});
