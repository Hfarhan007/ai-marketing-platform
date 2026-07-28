import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequireWorkspace } from '../../../common/decorators/require-workspace.decorator.js';
import { WorkspaceContext } from '../../../common/decorators/workspace-context.decorator.js';
import { ParseMongoIdPipe } from '../../../common/pipes/parse-mongo-id.pipe.js';
import type { WorkspaceRequestContext } from '../../../common/types/workspace-context.js';
import { BulkOperationDto, CrmListQueryDto, DataJobDto, VersionDto } from '../../crm/crm.dto.js';
import { RequirePermissions } from '../../permissions/decorators/require-permissions.decorator.js';
import { CreateDealDto, TransitionDealDto, UpdateDealDto } from '../dto/deal.dto.js';
import { DealsService } from '../services/deals.service.js';
@ApiTags('deals')
@Controller('deals')
@RequireWorkspace()
export class DealsController {
  constructor(private readonly s: DealsService) {}
  @Get() @RequirePermissions('deals.read') list(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Query() q: CrmListQueryDto,
  ) {
    return this.s.list(c, q);
  }
  @Get(':id') @RequirePermissions('deals.read') get(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Param('id', ParseMongoIdPipe) id: string,
  ) {
    return this.s.get(c, id);
  }
  @Post() @RequirePermissions('deals.manage') create(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Body() d: CreateDealDto,
  ) {
    return this.s.create(c, d);
  }
  @Patch(':id') @RequirePermissions('deals.manage') update(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() d: UpdateDealDto,
  ) {
    return this.s.update(c, id, d);
  }
  @Delete(':id') @RequirePermissions('deals.manage') remove(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Param('id', ParseMongoIdPipe) id: string,
    @Query() d: VersionDto,
  ) {
    return this.s.remove(c, id, d.version);
  }
  @Post(':id/restore') @RequirePermissions('deals.manage') restore(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() d: VersionDto,
  ) {
    return this.s.restore(c, id, d.version);
  }
  @Post(':id/transition') @RequirePermissions('deals.manage') transition(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() d: TransitionDealDto,
  ) {
    return this.s.transition(c, id, d);
  }
  @Post('jobs/import') @RequirePermissions('deals.manage') imp(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Body() d: DataJobDto,
  ) {
    return this.s.createJob('import', c, d.options);
  }
  @Post('jobs/export') @RequirePermissions('deals.read') exp(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Body() d: DataJobDto,
  ) {
    return this.s.createJob('export', c, d.options);
  }
  @Post('bulk') @RequirePermissions('deals.manage') bulk(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Body() d: BulkOperationDto,
  ) {
    return this.s.bulk(c, d.items, d.action);
  }
}
