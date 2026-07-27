import { ForbiddenException, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PLATFORM_ADMIN_OPERATION_KEY } from '../constants/tenant.constants.js';
import type { RequestWithWorkspaceContext } from '../types/workspace-context.js';

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<boolean>(PLATFORM_ADMIN_OPERATION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;
    const request = context.switchToHttp().getRequest<RequestWithWorkspaceContext>();
    if (request.principal?.platformAdmin !== true) {
      throw new ForbiddenException({
        code: 'PLATFORM_ADMIN_REQUIRED',
        message: 'This operation requires explicit platform administrator authorization',
      });
    }
    return true;
  }
}
