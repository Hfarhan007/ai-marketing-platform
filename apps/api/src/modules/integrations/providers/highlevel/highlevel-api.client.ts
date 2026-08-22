import { Injectable } from '@nestjs/common';
import { HIGHLEVEL_API_BASE_URL,HIGHLEVEL_API_VERSION } from './highlevel.constants.js';
import { HighLevelError } from './highlevel.errors.js';
import { boundedBackoff,retryAfterMs,transportFailure } from '../../errors/provider-error.js';
@Injectable() export class HighLevelApiClient{
 async request<T>(token:string,path:string,options:{method?:string;query?:Record<string,string|number|undefined>;body?:unknown;version?:string}={}):Promise<T>{
  if(!token)throw new HighLevelError('HIGHLEVEL_TOKEN_MISSING','HighLevel access token is unavailable');
  const url=new URL(path,process.env.HIGHLEVEL_API_BASE_URL?.trim()||HIGHLEVEL_API_BASE_URL);for(const[k,v]of Object.entries(options.query??{}))if(v!==undefined)url.searchParams.set(k,String(v));
  for(let attempt=0;attempt<3;attempt+=1){let response:Response;try{response=await fetch(url,{method:options.method??'GET',headers:{Authorization:`Bearer ${token}`,Accept:'application/json',Version:options.version??HIGHLEVEL_API_VERSION,...(options.body?{'Content-Type':'application/json'}:{})},...(options.body?{body:JSON.stringify(options.body)}:{}),signal:AbortSignal.timeout(15_000)});}catch(error){const failure=transportFailure('highlevel',error);if(attempt<2){await new Promise(resolve=>setTimeout(resolve,boundedBackoff(attempt)));continue}throw new HighLevelError(failure.code,failure.message,true,undefined,failure.kind)}
   if(response.ok)return (response.status===204?{}:await response.json())as T;
   const retryable=response.status===429||response.status>=500,kind=response.status===429?'rate_limit':response.status===401?'authentication':response.status===403?'permission':response.status===400?'invalid_request':'provider_failure',retry=retryAfterMs(response.headers.get('retry-after'));if(retryable&&attempt<2){await new Promise(resolve=>setTimeout(resolve,boundedBackoff(attempt,retry)));continue}
   throw new HighLevelError(`HIGHLEVEL_HTTP_${response.status}`,`HighLevel API request failed with status ${response.status}`,retryable,response.status,kind,retry);
  }throw new HighLevelError('HIGHLEVEL_RETRY_EXHAUSTED','HighLevel API retries exhausted',true);
 }
}
