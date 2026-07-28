import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { OAuthService } from './oauth.service.js';
describe('OAuthService',()=>{
 it('issues PKCE and consumes state exactly once',async()=>{let stored='';const redis={set:vi.fn((_key:string,value:string)=>{stored=value;return Promise.resolve('OK')}),eval:vi.fn().mockImplementation(()=>{const value=stored;stored='';return Promise.resolve(value||null)})};const service=new OAuthService(redis as never),begin=await service.begin({workspaceId:'w',userId:'u',provider:'gmail',connectionId:'c',redirectUri:'https://example.test/callback'});expect(begin.codeChallengeMethod).toBe('S256');expect(begin.state).not.toContain('w');await expect(service.consume(begin.state)).resolves.toMatchObject({workspaceId:'w',provider:'gmail'});await expect(service.consume(begin.state)).rejects.toBeInstanceOf(UnauthorizedException)});
});
