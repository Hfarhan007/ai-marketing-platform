import { ProviderRequestError,type ProviderFailureKind } from '../../errors/provider-error.js';
export class HighLevelError extends ProviderRequestError {
  constructor(code:string,message:string,retryable=false,status?:number,kind:ProviderFailureKind='unknown',retryAfterMs?:number){super({code,message,retryable,kind,...(status===undefined?{}:{status}),...(retryAfterMs===undefined?{}:{retryAfterMs})});this.name='HighLevelError'}
}
