import { Inject, Injectable, UnauthorizedException, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ACCESS_COOKIE, PUBLIC_ROUTE_KEY } from '../../../common/constants/auth.constants.js';
import type { RequestWithWorkspaceContext } from '../../../common/types/workspace-context.js';
import { UsersRepository } from '../../users/repositories/users.repository.js';
import { AuthRepository } from '../repositories/auth.repository.js';
import { AccessTokenService } from '../services/access-token.service.js';

interface AuthRequest extends RequestWithWorkspaceContext {
  cookies?: Record<string, string | undefined>;
}

@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AccessTokenService) private readonly tokens: AccessTokenService,
    @Inject(AuthRepository) private readonly auth: AuthRepository,
    @Inject(UsersRepository) private readonly users: UsersRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const token = this.readToken(request);
    const claims = this.tokens.verify(token);
    const [session, user] = await Promise.all([
      this.auth.findActiveSession(claims.sid),
      this.users.findById(claims.sub),
    ]);
    if (
      !session ||
      !user ||
      Math.floor(user.passwordChangedAt.getTime() / 1_000) !== claims.pwd
    ) {
      throw new UnauthorizedException('Session is not active');
    }
    request.principal = {
      userId: claims.sub,
      sessionId: claims.sid,
      platformAdmin: claims.adm,
    };
    return true;
  }

  private readToken(request: AuthRequest): string {
    const authorization = request.headers.authorization;
    if (typeof authorization === 'string' && authorization.startsWith('Bearer ')) {
      return authorization.slice(7);
    }
    const cookie = request.cookies?.[ACCESS_COOKIE];
    if (!cookie) throw new UnauthorizedException('Authentication required');
    return cookie;
  }
}
