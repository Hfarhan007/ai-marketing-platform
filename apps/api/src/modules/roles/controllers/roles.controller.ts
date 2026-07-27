import { Body, Controller, Delete, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { RequireCsrf } from '../../../common/decorators/require-csrf.decorator.js';
import { RequireWorkspace } from '../../../common/decorators/require-workspace.decorator.js';
import { WorkspaceContext } from '../../../common/decorators/workspace-context.decorator.js';
import type { WorkspaceRequestContext } from '../../../common/types/workspace-context.js';
import { RequirePermissions } from '../../permissions/decorators/require-permissions.decorator.js';
import { AssignRolesDto, CreateRoleDto } from '../dto/role.dto.js';
import { RolesService } from '../services/roles.service.js';

@Controller('roles')
@RequireWorkspace()
@RequirePermissions('team.manage')
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Post()
  @RequireCsrf()
  create(@WorkspaceContext() context: WorkspaceRequestContext, @Body() dto: CreateRoleDto) {
    return this.roles.create(context, dto);
  }

  @Delete(':roleId')
  @RequireCsrf()
  @HttpCode(204)
  revoke(
    @WorkspaceContext() context: WorkspaceRequestContext,
    @Param('roleId') roleId: string,
  ): Promise<void> {
    return this.roles.revoke(context, roleId);
  }

  @Patch('memberships/:membershipId')
  @RequireCsrf()
  @HttpCode(204)
  assign(
    @WorkspaceContext() context: WorkspaceRequestContext,
    @Param('membershipId') membershipId: string,
    @Body() dto: AssignRolesDto,
  ): Promise<void> {
    return this.roles.assign(context, membershipId, dto);
  }
}
