import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_WORKSPACE_KEY, WORKSPACE_HEADER } from '../constants/tenant.constants.js';
import type { RequestWithWorkspaceContext } from '../types/workspace-context.js';
import { MembershipsRepository } from '../../modules/memberships/repositories/memberships.repository.js';
import { WorkspacesRepository } from '../../modules/workspaces/repositories/workspaces.repository.js';

@Injectable()
export class WorkspaceGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly memberships: MembershipsRepository,
    private readonly workspaces: WorkspacesRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<boolean>(REQUIRE_WORKSPACE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;

    const request = context.switchToHttp().getRequest<RequestWithWorkspaceContext>();
    if (!request.principal) {
      throw new UnauthorizedException({
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication is required',
      });
    }
    const workspaceId = this.readWorkspaceId(request);
    const [workspace, membership] = await Promise.all([
      this.workspaces.findActiveById(workspaceId),
      this.memberships.findActiveMembership(workspaceId, request.principal.userId),
    ]);
    if (!workspace || !membership) {
      throw new ForbiddenException({
        code: 'WORKSPACE_ACCESS_DENIED',
        message: 'The authenticated user does not have access to this workspace',
      });
    }
    request.workspaceContext = {
      workspaceId: workspace._id.toString(),
      userId: request.principal.userId,
      membershipId: membership._id.toString(),
      roleIds: membership.roleIds.map((roleId) => roleId.toString()),
    };
    return true;
  }

  private readWorkspaceId(request: RequestWithWorkspaceContext): string {
    const value = request.headers[WORKSPACE_HEADER];
    if (typeof value !== 'string' || !/^[a-fA-F0-9]{24}$/u.test(value)) {
      throw new BadRequestException({
        code: 'INVALID_WORKSPACE_CONTEXT',
        message: `A valid ${WORKSPACE_HEADER} header is required`,
      });
    }
    return value;
  }
}
