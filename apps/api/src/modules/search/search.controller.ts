import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequireWorkspace } from '../../common/decorators/require-workspace.decorator.js';
import { WorkspaceContext } from '../../common/decorators/workspace-context.decorator.js';
import type { WorkspaceRequestContext } from '../../common/types/workspace-context.js';
import {
  RequireAnyPermission,
  RequirePermissions,
} from '../permissions/decorators/require-permissions.decorator.js';
import { SearchDto, SearchEntityParamDto } from './dto/search.dto.js';
import { SearchService } from './search.service.js';
import type { SearchEntity } from './search.types.js';

@ApiTags('search')
@RequireWorkspace()
@Controller('search')
export class SearchController {
  constructor(private readonly service: SearchService) {}
  @Post(':entity')
  @RequireAnyPermission(
    'contacts.read',
    'companies.read',
    'leads.read',
    'deals.read',
    'tasks.read',
    'inbox.read',
    'campaigns.read',
    'workflows.read',
    'appointments.read',
    'files.read',
  )
  search(
    @WorkspaceContext() context: WorkspaceRequestContext,
    @Param() params: SearchEntityParamDto,
    @Body() dto: SearchDto,
  ) {
    return this.service.search(context, params.entity as SearchEntity, {
      ...(dto.filter ? { filter: dto.filter } : {}),
      ...(dto.text ? { text: dto.text } : {}),
      ...(dto.sort
        ? {
            sort: {
              field: typeof dto.sort.field === 'string' ? dto.sort.field : '',
              direction:
                typeof dto.sort.direction === 'string'
                  ? (dto.sort.direction as 'asc' | 'desc')
                  : 'desc',
            },
          }
        : {}),
      ...(dto.cursor ? { cursor: dto.cursor } : {}),
      limit: dto.limit,
      export: dto.export,
    });
  }
  @Get('admin/metrics')
  @RequirePermissions('admin.access')
  metrics() {
    return this.service.metricSnapshot();
  }
  @Get('admin/index-recommendations')
  @RequirePermissions('admin.access')
  recommendations() {
    return this.service.recommendations();
  }
}
