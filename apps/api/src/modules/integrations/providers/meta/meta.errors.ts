import { BadGatewayException, UnauthorizedException } from '@nestjs/common';
import type { ProviderFailureKind } from '../../errors/provider-error.js';

export class MetaOAuthException extends UnauthorizedException {
  constructor(code: string, message: string, reauthorize = true) {
    super({ statusCode: 401, code, message, reauthorize });
  }
}

export class MetaApiException extends BadGatewayException {
  readonly code:string;readonly retryable:boolean;readonly providerStatus:number|undefined;readonly kind:ProviderFailureKind;readonly retryAfterMs:number|undefined;
  constructor(code: string, message: string, retryable: boolean,status?:number,kind:ProviderFailureKind='provider_failure',retryAfterMs?:number) {
    super({ statusCode: 502, code, message, retryable,providerStatus:status,kind,retryAfterMs });this.code=code;this.retryable=retryable;this.providerStatus=status;this.kind=kind;this.retryAfterMs=retryAfterMs;
  }
}
