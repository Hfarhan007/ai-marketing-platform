import { ForbiddenException, Injectable } from '@nestjs/common';
import type { WorkspaceRequestContext } from '../../../common/types/workspace-context.js';
import { WorkspacesRepository } from '../repositories/workspaces.repository.js';

@Injectable()
export class WorkspaceManagementPolicy {
  constructor(private readonly workspaces: WorkspacesRepository) {}

  async authorize(context: WorkspaceRequestContext): Promise<void> {
    const workspace = await this.workspaces.findActiveById(context.workspaceId);
    if (!workspace || workspace.ownerId.toString() !== context.userId) {
      throw new ForbiddenException({
        code: 'WORKSPACE_MANAGEMENT_FORBIDDEN',
        message: 'Workspace owner authorization is required',
      });
    }
  }
}
