import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequireWorkspace } from '../../../common/decorators/require-workspace.decorator.js';
import { WorkspaceContext } from '../../../common/decorators/workspace-context.decorator.js';
import { ParseMongoIdPipe } from '../../../common/pipes/parse-mongo-id.pipe.js';
import type { WorkspaceRequestContext } from '../../../common/types/workspace-context.js';
import { BulkOperationDto, CrmListQueryDto, DataJobDto, VersionDto } from '../../crm/crm.dto.js';
import { RequirePermissions } from '../../permissions/decorators/require-permissions.decorator.js';
import { ConvertLeadDto, CreateLeadDto, QualifyLeadDto, UpdateLeadDto } from '../dto/lead.dto.js';
import { LeadsService } from '../services/leads.service.js';
import { LeadQualificationService } from '../services/lead-qualification.service.js';
@ApiTags('leads')
@Controller('leads')
@RequireWorkspace()
export class LeadsController {
  constructor(private readonly s: LeadsService, private readonly qualifications: LeadQualificationService) {}
  @Get() @RequirePermissions('leads.read') list(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Query() q: CrmListQueryDto,
  ) {
    return this.s.list(c, q);
  }
  @Get(':id') @RequirePermissions('leads.read') get(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Param('id', ParseMongoIdPipe) id: string,
  ) {
    return this.s.get(c, id);
  }
  @Post() @RequirePermissions('leads.create') create(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Body() d: CreateLeadDto,
  ) {
    return this.s.create(c, d);
  }
  @Post('qualifications') @RequirePermissions('leads.read') qualify(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Body() d: QualifyLeadDto,
    @Req() request: { raw: { once(event: 'aborted', listener: () => void): void; removeListener(event: 'aborted', listener: () => void): void } },
  ) {
    const controller = new AbortController();
    const abort = () => controller.abort(new Error('Client cancelled lead qualification'));
    request.raw.once('aborted', abort);
    return this.qualifications.qualify(c, { ...d, signal: controller.signal }).finally(() => request.raw.removeListener('aborted', abort));
  }
  @Patch(':id') @RequirePermissions('leads.update') update(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() d: UpdateLeadDto,
  ) {
    return this.s.update(c, id, d);
  }
  @Delete(':id') @RequirePermissions('leads.delete') remove(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Param('id', ParseMongoIdPipe) id: string,
    @Query() d: VersionDto,
  ) {
    return this.s.remove(c, id, d.version);
  }
  @Post(':id/restore') @RequirePermissions('leads.update') restore(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() d: VersionDto,
  ) {
    return this.s.restore(c, id, d.version);
  }
  @Post(':id/convert') @RequirePermissions('leads.convert') convert(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() d: ConvertLeadDto,
  ) {
    return this.s.convert(c, id, d);
  }
  @Post('jobs/import') @RequirePermissions('leads.create') imp(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Body() d: DataJobDto,
  ) {
    return this.s.createJob('import', c, d.options);
  }
  @Post('jobs/export') @RequirePermissions('leads.read') exp(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Body() d: DataJobDto,
  ) {
    return this.s.createJob('export', c, d.options);
  }
  @Post('bulk') @RequirePermissions('leads.update') bulk(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Body() d: BulkOperationDto,
  ) {
    return this.s.bulk(c, d.items, d.action);
  }
}
