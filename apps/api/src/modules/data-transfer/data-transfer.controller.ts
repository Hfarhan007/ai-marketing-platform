import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequireWorkspace } from '../../common/decorators/require-workspace.decorator.js';
import { WorkspaceContext } from '../../common/decorators/workspace-context.decorator.js';
import { ParseMongoIdPipe } from '../../common/pipes/parse-mongo-id.pipe.js';
import type { WorkspaceRequestContext } from '../../common/types/workspace-context.js';
import { RequireAnyPermission } from '../permissions/decorators/require-permissions.decorator.js';
import {
  CreateExportDto,
  CreateImportDto,
  UpdateImportMappingDto,
} from './dto/data-transfer.dto.js';
import { DataTransferService } from './services/data-transfer.service.js';
@ApiTags('data-transfer')
@RequireWorkspace()
@RequireAnyPermission(
  'contacts.read',
  'companies.read',
  'leads.read',
  'deals.read',
  'agents.manage',
)
@Controller('data-transfers')
export class DataTransferController {
  constructor(private readonly service: DataTransferService) {}
  @Post('imports') createImport(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Body() d: CreateImportDto,
  ) {
    return this.service.createImport(c, d);
  }
  @Post('exports') createExport(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Body() d: CreateExportDto,
  ) {
    return this.service.createExport(c, d);
  }
  @Post(':id/configure') configure(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() d: UpdateImportMappingDto,
  ) {
    return this.service.configure(c, id, d);
  }
  @Post(':id/start') start(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Param('id', ParseMongoIdPipe) id: string,
  ) {
    return this.service.start(c, id);
  }
  @Post(':id/cancel') cancel(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Param('id', ParseMongoIdPipe) id: string,
  ) {
    return this.service.cancel(c, id);
  }
  @Get(':id') status(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Param('id', ParseMongoIdPipe) id: string,
  ) {
    return this.service.status(c, id);
  }
  @Get(':id/download') download(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Param('id', ParseMongoIdPipe) id: string,
  ) {
    return this.service.download(c, id);
  }
  @Get(':id/errors/download') errors(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Param('id', ParseMongoIdPipe) id: string,
  ) {
    return this.service.download(c, id, true);
  }
  @Post(':id/corrected-reimport') corrected(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() body: { fileId: string; idempotencyKey: string },
  ) {
    return this.service.correctedReimport(c, id, body.fileId, body.idempotencyKey);
  }
}
