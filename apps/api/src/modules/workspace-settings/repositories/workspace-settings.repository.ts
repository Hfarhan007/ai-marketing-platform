import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model, UpdateQuery } from 'mongoose';
import { TenantAwareRepository } from '../../../common/repositories/tenant-aware.repository.js';
import { WorkspaceSettings } from '../schemas/workspace-settings.schema.js';

@Injectable()
export class WorkspaceSettingsRepository extends TenantAwareRepository<WorkspaceSettings> {
  constructor(@InjectModel(WorkspaceSettings.name) settings: Model<WorkspaceSettings>) {
    super(settings);
  }

  findForWorkspace(workspaceId: string): Promise<WorkspaceSettings | null> {
    return this.findOne(workspaceId, {});
  }

  updateForWorkspace(
    workspaceId: string,
    update: UpdateQuery<WorkspaceSettings>,
  ): Promise<WorkspaceSettings | null> {
    return this.updateOne(workspaceId, {}, update);
  }
}
