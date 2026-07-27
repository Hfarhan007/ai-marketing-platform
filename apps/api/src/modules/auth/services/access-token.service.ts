import { createHmac, timingSafeEqual } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AccessTokenClaims {
  sub: string;
  sid: string;
  adm: boolean;
  pwd: number;
  iss: string;
  iat: number;
  exp: number;
}

@Injectable()
export class AccessTokenService {
  private readonly secret: string;
  private readonly issuer: string;
  private readonly ttl: number;

  constructor(config: ConfigService) {
    this.secret = config.getOrThrow<string>('auth.accessTokenSecret');
    this.issuer = config.getOrThrow<string>('auth.issuer');
    this.ttl = config.getOrThrow<number>('auth.accessTokenTtlSeconds');
  }

  sign(input: Omit<AccessTokenClaims, 'iss' | 'iat' | 'exp'>): string {
    const now = Math.floor(Date.now() / 1_000);
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({ ...input, iss: this.issuer, iat: now, exp: now + this.ttl }),
    ).toString('base64url');
    const signature = this.signature(`${header}.${payload}`);
    return `${header}.${payload}.${signature}`;
  }

  verify(token: string): AccessTokenClaims {
    const parts = token.split('.');
    if (parts.length !== 3) throw new UnauthorizedException('Invalid access token');
    const [header, payload, signature] = parts as [string, string, string];
    const expected = this.signature(`${header}.${payload}`);
    const suppliedBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (
      suppliedBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(suppliedBuffer, expectedBuffer)
    ) {
      throw new UnauthorizedException('Invalid access token');
    }
    const claims: unknown = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!this.isClaims(claims) || claims.iss !== this.issuer || claims.exp <= Date.now() / 1_000) {
      throw new UnauthorizedException('Expired or invalid access token');
    }
    return claims;
  }

  private signature(value: string): string {
    return createHmac('sha256', this.secret).update(value).digest('base64url');
  }

  private isClaims(value: unknown): value is AccessTokenClaims {
    if (typeof value !== 'object' || value === null) return false;
    const candidate = value as Record<string, unknown>;
    return (
      typeof candidate.sub === 'string' &&
      typeof candidate.sid === 'string' &&
      typeof candidate.adm === 'boolean' &&
      typeof candidate.pwd === 'number' &&
      typeof candidate.iss === 'string' &&
      typeof candidate.iat === 'number' &&
      typeof candidate.exp === 'number'
    );
  }
}
