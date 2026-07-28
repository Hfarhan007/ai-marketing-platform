import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import type { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../../../cache/redis.constants.js';
import type { Provider } from '../types/provider-adapter.js';
interface OAuthState { workspaceId:string; userId:string; provider:Provider; connectionId:string; codeVerifier:string; redirectUri:string }
@Injectable()
export class OAuthService {
 constructor(@Inject(REDIS_CLIENT)private readonly redis:Redis){}
 async begin(input:Omit<OAuthState,'codeVerifier'>){const state=randomBytes(32).toString('base64url'),codeVerifier=randomBytes(48).toString('base64url'),codeChallenge=createHash('sha256').update(codeVerifier).digest('base64url');await this.redis.set(`oauth:state:${createHash('sha256').update(state).digest('hex')}`,JSON.stringify({...input,codeVerifier}),'EX',600,'NX');return{state,codeChallenge,codeChallengeMethod:'S256' as const}}
 async consume(state:string){const key=`oauth:state:${createHash('sha256').update(state).digest('hex')}`;const script='local v=redis.call("GET",KEYS[1]); if v then redis.call("DEL",KEYS[1]); end; return v';const value=await this.redis.eval(script,1,key);if(typeof value!=='string')throw new UnauthorizedException('Invalid or expired OAuth state');return JSON.parse(value)as OAuthState}
}
