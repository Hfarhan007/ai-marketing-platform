import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { WorkspaceRequestContext } from '../../../common/types/workspace-context.js';
import { MembershipsRepository } from '../../memberships/repositories/memberships.repository.js';
import { PermissionEventsService } from '../../permissions/services/permission-events.service.js';
import type { AssignRolesDto, CreateRoleDto } from '../dto/role.dto.js';
import { RolesRepository } from '../repositories/roles.repository.js';

@Injectable()
export class RolesService {
  constructor(
    private readonly roles: RolesRepository,
    private readonly memberships: MembershipsRepository,
    private readonly events: PermissionEventsService,
  ) {}

  async create(context: WorkspaceRequestContext, dto: CreateRoleDto) {
    const role = await this.roles.createWorkspaceRole(context.workspaceId, dto);
    this.events.invalidate(context.workspaceId);
    return {
      id: role._id.toString(),
      name: role.name,
      key: role.key,
      permissions: role.permissions,
      permissionGroups: role.permissionGroups,
    };
  }

  async revoke(context: WorkspaceRequestContext, roleId: string): Promise<void> {
    const role = await this.roles.revokeWorkspaceRole(context.workspaceId, roleId);
    if (!role) throw new NotFoundException('Role not found or cannot be revoked');
    this.events.invalidate(context.workspaceId);
  }

  async assign(
    context: WorkspaceRequestContext,
    membershipId: string,
    dto: AssignRolesDto,
  ): Promise<void> {
    const uniqueRoleIds = [...new Set(dto.roleIds)];
    const roles = await this.roles.findAssigned(context.workspaceId, uniqueRoleIds);
    if (roles.length !== uniqueRoleIds.length) {
      throw new BadRequestException('One or more roles are revoked or outside this workspace');
    }
    if (!(await this.memberships.assignRoles(context.workspaceId, membershipId, uniqueRoleIds))) {
      throw new NotFoundException('Active membership not found');
    }
    this.events.invalidate(context.workspaceId, membershipId);
  }
}
