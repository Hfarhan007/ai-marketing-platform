import { ForbiddenException, Inject, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CSRF_COOKIE, REQUIRE_CSRF_KEY } from '../../../common/constants/auth.constants.js';
import { AuthCryptoService } from '../services/auth-crypto.service.js';

interface CsrfRequest {
  cookies?: Record<string, string | undefined>;
  headers: Record<string, string | string[] | undefined>;
}

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AuthCryptoService) private readonly crypto: AuthCryptoService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<boolean>(REQUIRE_CSRF_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;
    const request = context.switchToHttp().getRequest<CsrfRequest>();
    const cookie = request.cookies?.[CSRF_COOKIE];
    const header = request.headers['x-csrf-token'];
    if (!cookie || typeof header !== 'string' || !this.crypto.safeEqual(cookie, header)) {
      throw new ForbiddenException({ code: 'CSRF_VALIDATION_FAILED', message: 'Invalid CSRF token' });
    }
    return true;
  }
}
