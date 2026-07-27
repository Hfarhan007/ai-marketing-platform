import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequireWorkspace } from '../../../common/decorators/require-workspace.decorator.js';
import { WorkspaceContext } from '../../../common/decorators/workspace-context.decorator.js';
import type { WorkspaceRequestContext } from '../../../common/types/workspace-context.js';
import type { MembershipResponseDto } from '../dto/membership-response.dto.js';
import { MembershipsService } from '../services/memberships.service.js';
import { RequirePermissions } from '../../permissions/decorators/require-permissions.decorator.js';

@ApiTags('memberships')
@RequireWorkspace()
@Controller('memberships')
export class MembershipsController {
  constructor(private readonly memberships: MembershipsService) {}

  @Get()
  @RequirePermissions('team.manage')
  @ApiOperation({ summary: 'List memberships in the active workspace' })
  list(@WorkspaceContext() context: WorkspaceRequestContext): Promise<MembershipResponseDto[]> {
    return this.memberships.list(context);
  }
}
