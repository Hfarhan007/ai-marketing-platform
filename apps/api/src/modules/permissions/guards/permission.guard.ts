import { ForbiddenException, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { RequestWithWorkspaceContext } from '../../../common/types/workspace-context.js';
import {
  REQUIRED_PERMISSIONS_KEY,
  type PermissionRequirement,
} from '../decorators/require-permissions.decorator.js';
import type { RequestWithAbility } from '../types/ability-context.js';
import { PolicyService } from '../services/policy.service.js';
import { PrivilegedAuditService } from '../services/privileged-audit.service.js';

type PolicyRequest = RequestWithWorkspaceContext & RequestWithAbility;

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly policy: PolicyService,
    private readonly audit: PrivilegedAuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requirement = this.reflector.getAllAndOverride<PermissionRequirement>(
      REQUIRED_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requirement) return true;
    const request = context.switchToHttp().getRequest<PolicyRequest>();
    if (!request.workspaceContext) {
      throw new ForbiddenException('Workspace context is required before permission evaluation');
    }
    const ability = await this.policy.ability(request.workspaceContext);
    request.ability = ability;
    const authorized =
      requirement.mode === 'all'
        ? this.policy.hasAll(ability, requirement.permissions)
        : this.policy.hasAny(ability, requirement.permissions);
    await this.audit.record(
      request.workspaceContext,
      requirement.permissions,
      authorized,
      `${context.getClass().name}.${context.getHandler().name}`,
    );
    if (!authorized) {
      throw new ForbiddenException({
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'The operation is not permitted',
      });
    }
    return true;
  }
}
