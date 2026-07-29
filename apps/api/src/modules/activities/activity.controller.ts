import { Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequireWorkspace } from '../../common/decorators/require-workspace.decorator.js';
import { WorkspaceContext } from '../../common/decorators/workspace-context.decorator.js';
import type { WorkspaceRequestContext } from '../../common/types/workspace-context.js';
import {
  RequireAnyPermission,
  RequirePermissions,
} from '../permissions/decorators/require-permissions.decorator.js';
import { ActivityService } from './activity.service.js';
import { ActivityQueryDto } from './dto/activity-query.dto.js';

@ApiTags('activities')
@RequireWorkspace()
@Controller('activities')
export class ActivityController {
  constructor(private readonly service: ActivityService) {}
  @Get()
  @RequireAnyPermission(
    'contacts.read',
    'companies.read',
    'leads.read',
    'deals.read',
    'tasks.read',
    'appointments.read',
    'inbox.read',
    'campaigns.read',
    'workflows.read',
    'files.read',
  )
  timeline(@WorkspaceContext() context: WorkspaceRequestContext, @Query() query: ActivityQueryDto) {
    return this.service.timeline(context, query);
  }
  @Post('rebuild')
  @RequirePermissions('admin.access')
  rebuild(@WorkspaceContext() context: WorkspaceRequestContext) {
    return this.service.rebuild(context);
  }
}
