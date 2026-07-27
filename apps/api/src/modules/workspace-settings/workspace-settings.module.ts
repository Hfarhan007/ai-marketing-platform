import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WorkspacesModule } from '../workspaces/workspaces.module.js';
import { WorkspaceSettingsController } from './controllers/workspace-settings.controller.js';
import { WorkspaceSettingsRepository } from './repositories/workspace-settings.repository.js';
import { WorkspaceSettings, WorkspaceSettingsSchema } from './schemas/workspace-settings.schema.js';
import { WorkspaceSettingsService } from './services/workspace-settings.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WorkspaceSettings.name, schema: WorkspaceSettingsSchema },
    ]),
    WorkspacesModule,
  ],
  controllers: [WorkspaceSettingsController],
  providers: [WorkspaceSettingsRepository, WorkspaceSettingsService],
})
export class WorkspaceSettingsModule {}
