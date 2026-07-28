import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequireWorkspace } from '../../../common/decorators/require-workspace.decorator.js';
import { WorkspaceContext } from '../../../common/decorators/workspace-context.decorator.js';
import { ParseMongoIdPipe } from '../../../common/pipes/parse-mongo-id.pipe.js';
import type { WorkspaceRequestContext } from '../../../common/types/workspace-context.js';
import { BulkOperationDto, CrmListQueryDto, DataJobDto, VersionDto } from '../../crm/crm.dto.js';
import { RequirePermissions } from '../../permissions/decorators/require-permissions.decorator.js';
import { CreatePipelineDto, UpdatePipelineDto } from '../dto/pipeline.dto.js';
import { PipelinesService } from '../services/pipelines.service.js';
@ApiTags('pipelines')
@Controller('pipelines')
@RequireWorkspace()
export class PipelinesController {
  constructor(private readonly s: PipelinesService) {}
  @Get() @RequirePermissions('pipelines.read') list(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Query() q: CrmListQueryDto,
  ) {
    return this.s.list(c, q);
  }
  @Get(':id') @RequirePermissions('pipelines.read') get(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Param('id', ParseMongoIdPipe) id: string,
  ) {
    return this.s.get(c, id);
  }
  @Post() @RequirePermissions('pipelines.manage') create(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Body() d: CreatePipelineDto,
  ) {
    return this.s.create(c, d);
  }
  @Patch(':id') @RequirePermissions('pipelines.manage') update(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() d: UpdatePipelineDto,
  ) {
    return this.s.update(c, id, d);
  }
  @Delete(':id') @RequirePermissions('pipelines.manage') remove(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Param('id', ParseMongoIdPipe) id: string,
    @Query() d: VersionDto,
  ) {
    return this.s.remove(c, id, d.version);
  }
  @Post(':id/restore') @RequirePermissions('pipelines.manage') restore(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() d: VersionDto,
  ) {
    return this.s.restore(c, id, d.version);
  }
  @Post('jobs/import') @RequirePermissions('pipelines.manage') imp(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Body() d: DataJobDto,
  ) {
    return this.s.createJob('import', c, d.options);
  }
  @Post('jobs/export') @RequirePermissions('pipelines.read') exp(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Body() d: DataJobDto,
  ) {
    return this.s.createJob('export', c, d.options);
  }
  @Post('bulk') @RequirePermissions('pipelines.manage') bulk(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Body() d: BulkOperationDto,
  ) {
    return this.s.bulk(c, d.items, d.action);
  }
}
