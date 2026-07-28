import { Body, Controller, Delete, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequireWorkspace } from '../../common/decorators/require-workspace.decorator.js';
import { WorkspaceContext } from '../../common/decorators/workspace-context.decorator.js';
import { ParseMongoIdPipe } from '../../common/pipes/parse-mongo-id.pipe.js';
import type { WorkspaceRequestContext } from '../../common/types/workspace-context.js';
import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator.js';
import { VersionDto } from '../crm/crm.dto.js';
import { CustomFieldService } from './custom-field.service.js';
import { CUSTOM_FIELD_ENTITIES, type CustomFieldEntity } from './custom-field.types.js';
import {
  CreateCustomFieldDto,
  MigrateCustomFieldDto,
  UpdateCustomFieldDto,
} from './dto/custom-field.dto.js';

@ApiTags('custom-fields')
@RequireWorkspace()
@Controller('custom-fields')
export class CustomFieldController {
  constructor(private readonly service: CustomFieldService) {}
  @Post()
  @RequirePermissions('admin.access')
  create(@WorkspaceContext() context: WorkspaceRequestContext, @Body() dto: CreateCustomFieldDto) {
    return this.service.create(context, dto);
  }
  @Patch(':id')
  @RequirePermissions('admin.access')
  update(
    @WorkspaceContext() context: WorkspaceRequestContext,
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() dto: UpdateCustomFieldDto,
  ) {
    return this.service.update(context, id, dto);
  }
  @Delete(':id')
  @RequirePermissions('admin.access')
  archive(
    @WorkspaceContext() context: WorkspaceRequestContext,
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() dto: VersionDto,
  ) {
    return this.service.archive(context, id, dto.version);
  }
  @Post(':id/migrations')
  @RequirePermissions('admin.access')
  migrate(
    @WorkspaceContext() context: WorkspaceRequestContext,
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() dto: MigrateCustomFieldDto,
  ) {
    return this.service.migrate(context, id, dto);
  }
  @Post('definitions/list')
  @RequirePermissions('admin.access')
  list(
    @WorkspaceContext() context: WorkspaceRequestContext,
    @Query('entityType') entityType: CustomFieldEntity,
  ) {
    if (!CUSTOM_FIELD_ENTITIES.includes(entityType)) return [];
    return this.service.definitions(context.workspaceId, entityType);
  }
}
