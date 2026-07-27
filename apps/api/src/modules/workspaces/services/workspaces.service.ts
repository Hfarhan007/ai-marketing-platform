import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { WorkspaceRequestContext } from '../../../common/types/workspace-context.js';
import type { WorkspaceResponseDto } from '../dto/workspace-response.dto.js';
import { mapWorkspaceResponse } from '../mappers/workspace.mapper.js';
import { WorkspacesRepository } from '../repositories/workspaces.repository.js';

@Injectable()
export class WorkspacesService {
  constructor(@Inject(WorkspacesRepository) private readonly workspaces: WorkspacesRepository) {}

  async getCurrent(context: WorkspaceRequestContext): Promise<WorkspaceResponseDto> {
    const workspace = await this.workspaces.findActiveById(context.workspaceId);
    if (!workspace) throw new NotFoundException('Workspace not found');
    return mapWorkspaceResponse(workspace);
  }
}
