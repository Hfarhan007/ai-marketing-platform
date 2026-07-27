import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { RequestWithWorkspaceContext } from '../types/workspace-context.js';
import type { AuthenticatedPrincipal } from '../types/authenticated-principal.js';

export const CurrentPrincipal = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedPrincipal => {
    const request = context.switchToHttp().getRequest<RequestWithWorkspaceContext>();
    if (!request.principal) throw new Error('Authentication guard did not establish a principal');
    return request.principal;
  },
);
