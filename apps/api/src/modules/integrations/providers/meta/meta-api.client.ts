import { BadRequestException, ForbiddenException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { boundedBackoff,retryAfterMs,transportFailure } from '../../errors/provider-error.js';
import { MetaApiException } from './meta.errors.js';

@Injectable()
export class MetaApiClient {
  constructor(private readonly config: ConfigService) {}
  async request<T>(path: string, token?: string, init: RequestInit = {}): Promise<T> {
    const version = this.config.get<string>('integrations.meta.graphApiVersion') ?? 'v23.0';
    const url = path.startsWith('https://') ? path : `https://graph.facebook.com/${version}/${path.replace(/^\//u, '')}`;
    for(let attempt=0;attempt<3;attempt+=1){
      let response:Response;try{response=await fetch(url,{...init,headers:{accept:'application/json',...init.headers,...(token?{authorization:`Bearer ${token}`}:{})},signal:AbortSignal.timeout(15_000)});}catch(error){const failure=transportFailure('meta',error);if(attempt<2){await new Promise(resolve=>setTimeout(resolve,boundedBackoff(attempt)));continue}throw new MetaApiException(failure.code,failure.message,true,undefined,failure.kind);}
      let body:{error?:{message?:string;code?:number}}&T;try{body=await response.json()as typeof body;}catch{throw new MetaApiException('META_MALFORMED_RESPONSE','Meta returned malformed JSON',response.status>=500,response.status,'malformed_payload');}const code=body.error?.code,retryable=response.status===429||response.status>=500||[4,17,32,613].includes(code??0);
      if(response.ok&&!body.error)return body;
      if(retryable&&attempt<2){await new Promise((resolve)=>setTimeout(resolve,boundedBackoff(attempt,retryAfterMs(response.headers.get('retry-after')))));continue;}
      const message=body.error?.message??`Meta request failed (${response.status})`;
      if(response.status===401||code===190)throw new UnauthorizedException('Meta authorization expired; reauthorization is required');
      if(response.status===403)throw new ForbiddenException('Meta permission is missing for this resource');
      if(retryable)throw new MetaApiException(response.status===429?'META_RATE_LIMITED':`META_HTTP_${response.status}`,'Meta rate limit or temporary service limit was reached; retry later',true,response.status,response.status===429?'rate_limit':'provider_failure',retryAfterMs(response.headers.get('retry-after')));
      if(response.status===400)throw new BadRequestException(message);
      throw new ServiceUnavailableException(message);
    }
    throw new ServiceUnavailableException('Meta request retry limit reached');
  }
  async page<T>(path:string,token:string,limit=100){const records:T[]=[];let next:string|undefined=path;while(next&&records.length<limit){const value: { data?: T[]; paging?: { next?: string } } = await this.request(next,token);records.push(...(value.data??[]));next=value.paging?.next;}return records.slice(0,limit);}
  async pageResult<T>(path:string,token:string,limit=100){const value:{data?:T[];paging?:{cursors?:{after?:string}}}=await this.request(path,token);return{records:(value.data??[]).slice(0,limit),...(value.paging?.cursors?.after?{nextCursor:value.paging.cursors.after}:{})};}
}
