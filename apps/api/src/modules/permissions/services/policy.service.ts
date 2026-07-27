import { ForbiddenException, Injectable } from '@nestjs/common';
import type { WorkspaceRequestContext } from '../../../common/types/workspace-context.js';
import { RolesRepository } from '../../roles/repositories/roles.repository.js';
import { RoleScope } from '../../roles/schemas/role.schema.js';
import {
  ALLOWED_ADMIN_WILDCARDS,
  PERMISSION_GROUPS,
  PERMISSIONS,
  type Permission,
  type PermissionGroup,
} from '../constants/permission.catalog.js';
import type { AbilityContext } from '../types/ability-context.js';
import { PermissionCacheService } from './permission-cache.service.js';

@Injectable()
export class PolicyService {
  constructor(
    private readonly roles: RolesRepository,
    private readonly cache: PermissionCacheService,
  ) {}

  async ability(context: WorkspaceRequestContext): Promise<AbilityContext> {
    const cached = await this.cache.get(context.workspaceId, context.membershipId);
    const permissions = cached ?? (await this.resolvePermissions(context));
    return {
      workspaceId: context.workspaceId,
      userId: context.userId,
      membershipId: context.membershipId,
      permissions: new Set(permissions as (Permission | 'admin.*')[]),
    };
  }

  has(ability: AbilityContext, permission: Permission): boolean {
    if (ability.permissions.has(permission)) return true;
    return ALLOWED_ADMIN_WILDCARDS.some(
      (wildcard) =>
        ability.permissions.has(wildcard) &&
        permission.startsWith(`${wildcard.slice(0, -2)}.`),
    );
  }

  hasAll(ability: AbilityContext, permissions: readonly Permission[]): boolean {
    return permissions.every((permission) => this.has(ability, permission));
  }

  hasAny(ability: AbilityContext, permissions: readonly Permission[]): boolean {
    return permissions.some((permission) => this.has(ability, permission));
  }

  assertOwnership(
    ability: AbilityContext,
    resourceOwnerId: string,
    administrativePermission?: Permission,
  ): void {
    if (resourceOwnerId === ability.userId) return;
    if (administrativePermission && this.has(ability, administrativePermission)) return;
    throw new ForbiddenException({
      code: 'RESOURCE_OWNERSHIP_REQUIRED',
      message: 'The resource is not owned by the authenticated user',
    });
  }

  private async resolvePermissions(context: WorkspaceRequestContext): Promise<string[]> {
    const roles = await this.roles.findAssigned(context.workspaceId, context.roleIds);
    const resolved = new Set<string>();
    for (const role of roles) {
      for (const permission of role.permissions) {
        if (
          PERMISSIONS.includes(permission as Permission) ||
          (permission === 'admin.*' && role.scope === RoleScope.System && role.immutable)
        ) {
          resolved.add(permission);
        }
      }
      for (const groupName of role.permissionGroups) {
        const group = PERMISSION_GROUPS[groupName as PermissionGroup];
        if (group) group.forEach((permission) => resolved.add(permission));
      }
    }
    const permissions = [...resolved];
    await this.cache.set(
      context.workspaceId,
      context.membershipId,
      permissions as (Permission | 'admin.*')[],
    );
    return permissions;
  }
}
