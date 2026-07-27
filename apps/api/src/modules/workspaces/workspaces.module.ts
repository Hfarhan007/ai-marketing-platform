import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WorkspacesController } from './controllers/workspaces.controller.js';
import { WorkspaceManagementPolicy } from './policies/workspace-management.policy.js';
import { WorkspacesRepository } from './repositories/workspaces.repository.js';
import { Workspace, WorkspaceSchema } from './schemas/workspace.schema.js';
import { WorkspacesService } from './services/workspaces.service.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: Workspace.name, schema: WorkspaceSchema }])],
  controllers: [WorkspacesController],
  providers: [WorkspacesRepository, WorkspacesService, WorkspaceManagementPolicy],
  exports: [WorkspacesRepository, WorkspaceManagementPolicy],
})
export class WorkspacesModule {}
