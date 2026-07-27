import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequireWorkspace } from '../../../common/decorators/require-workspace.decorator.js';
import { WorkspaceContext } from '../../../common/decorators/workspace-context.decorator.js';
import type { WorkspaceRequestContext } from '../../../common/types/workspace-context.js';
import { UpdateWorkspaceSettingsDto } from '../dto/update-workspace-settings.dto.js';
import type { WorkspaceSettingsResponseDto } from '../dto/workspace-settings-response.dto.js';
import { WorkspaceSettingsService } from '../services/workspace-settings.service.js';
import { RequirePermissions } from '../../permissions/decorators/require-permissions.decorator.js';

@ApiTags('workspace-settings')
@RequireWorkspace()
@Controller('workspace-settings')
export class WorkspaceSettingsController {
  constructor(private readonly settings: WorkspaceSettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get settings for the active workspace' })
  get(@WorkspaceContext() context: WorkspaceRequestContext): Promise<WorkspaceSettingsResponseDto> {
    return this.settings.get(context);
  }

  @Patch()
  @RequirePermissions('team.manage')
  @ApiOperation({ summary: 'Update settings for the active workspace' })
  update(
    @WorkspaceContext() context: WorkspaceRequestContext,
    @Body() dto: UpdateWorkspaceSettingsDto,
  ): Promise<WorkspaceSettingsResponseDto> {
    return this.settings.update(context, dto);
  }
}
