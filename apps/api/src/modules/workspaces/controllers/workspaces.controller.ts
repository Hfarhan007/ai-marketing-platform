import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequireWorkspace } from '../../../common/decorators/require-workspace.decorator.js';
import { WorkspaceContext } from '../../../common/decorators/workspace-context.decorator.js';
import type { WorkspaceRequestContext } from '../../../common/types/workspace-context.js';
import type { WorkspaceResponseDto } from '../dto/workspace-response.dto.js';
import { WorkspacesService } from '../services/workspaces.service.js';

@ApiTags('workspaces')
@RequireWorkspace()
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Get('current')
  @ApiOperation({ summary: 'Get the active workspace context' })
  getCurrent(@WorkspaceContext() context: WorkspaceRequestContext): Promise<WorkspaceResponseDto> {
    return this.workspaces.getCurrent(context);
  }
}
