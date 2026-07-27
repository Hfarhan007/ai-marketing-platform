import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Types, type UpdateQuery } from 'mongoose';
import type { WorkspaceRequestContext } from '../../../common/types/workspace-context.js';
import type { UpdateWorkspaceSettingsDto } from '../dto/update-workspace-settings.dto.js';
import type { WorkspaceSettingsResponseDto } from '../dto/workspace-settings-response.dto.js';
import { mapWorkspaceSettingsResponse } from '../mappers/workspace-settings.mapper.js';
import { WorkspaceSettingsRepository } from '../repositories/workspace-settings.repository.js';
import type { WorkspaceSettings } from '../schemas/workspace-settings.schema.js';
import { WorkspaceManagementPolicy } from '../../workspaces/policies/workspace-management.policy.js';

@Injectable()
export class WorkspaceSettingsService {
  constructor(
    @Inject(WorkspaceSettingsRepository)
    private readonly settings: WorkspaceSettingsRepository,
    @Inject(WorkspaceManagementPolicy)
    private readonly management: WorkspaceManagementPolicy,
  ) {}

  async get(context: WorkspaceRequestContext): Promise<WorkspaceSettingsResponseDto> {
    const settings = await this.settings.findForWorkspace(context.workspaceId);
    if (!settings) throw new NotFoundException('Workspace settings not found');
    return mapWorkspaceSettingsResponse(settings);
  }

  async update(
    context: WorkspaceRequestContext,
    dto: UpdateWorkspaceSettingsDto,
  ): Promise<WorkspaceSettingsResponseDto> {
    await this.management.authorize(context);
    const update: UpdateQuery<WorkspaceSettings> = {
      $set: {
        ...dto,
        ...(dto.defaultPipelineId
          ? { defaultPipelineId: new Types.ObjectId(dto.defaultPipelineId) }
          : {}),
      },
    };
    const settings = await this.settings.updateForWorkspace(context.workspaceId, update);
    if (!settings) throw new NotFoundException('Workspace settings not found');
    return mapWorkspaceSettingsResponse(settings);
  }
}
