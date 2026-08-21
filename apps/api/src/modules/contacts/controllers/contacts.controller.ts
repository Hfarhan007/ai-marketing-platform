import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { WorkspaceContext } from '../../../common/decorators/workspace-context.decorator.js';
import { RequireWorkspace } from '../../../common/decorators/require-workspace.decorator.js';
import type { WorkspaceRequestContext } from '../../../common/types/workspace-context.js';
import { ParseMongoIdPipe } from '../../../common/pipes/parse-mongo-id.pipe.js';
import { RequirePermissions } from '../../permissions/decorators/require-permissions.decorator.js';
import { BulkOperationDto, CrmListQueryDto, DataJobDto, VersionDto } from '../../crm/crm.dto.js';
import { CreateContactDto, MergeContactsDto, UpdateContactDto } from '../dto/contact.dto.js';
import { ContactsService } from '../services/contacts.service.js';

@ApiTags('contacts')
@Controller('contacts')
@RequireWorkspace()
export class ContactsController {
  constructor(private readonly service: ContactsService) {}
  @Get()
  @ApiOperation({ summary: 'List workspace contacts with search, filters, sorting, and pagination' })
  @RequirePermissions('contacts.read')
  list(@WorkspaceContext() context: WorkspaceRequestContext, @Query() query: CrmListQueryDto) {
    return this.service.list(context, query);
  }
  @Get(':id')
  @ApiOperation({ summary: 'Get a workspace contact' })
  @ApiParam({ name: 'id', description: 'Contact MongoDB identifier' })
  @RequirePermissions('contacts.read')
  get(
    @WorkspaceContext() context: WorkspaceRequestContext,
    @Param('id', ParseMongoIdPipe) id: string,
  ) {
    return this.service.get(context, id);
  }
  @Post()
  @ApiOperation({ summary: 'Create a contact' })
  @RequirePermissions('contacts.create')
  create(@WorkspaceContext() context: WorkspaceRequestContext, @Body() dto: CreateContactDto) {
    return this.service.create(context, dto);
  }
  @Patch(':id')
  @ApiOperation({ summary: 'Update a contact using optimistic concurrency' })
  @ApiParam({ name: 'id', description: 'Contact MongoDB identifier' })
  @RequirePermissions('contacts.update')
  update(
    @WorkspaceContext() context: WorkspaceRequestContext,
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() dto: UpdateContactDto,
  ) {
    return this.service.update(context, id, dto);
  }
  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a contact using optimistic concurrency' })
  @ApiParam({ name: 'id', description: 'Contact MongoDB identifier' })
  @RequirePermissions('contacts.delete')
  remove(
    @WorkspaceContext() context: WorkspaceRequestContext,
    @Param('id', ParseMongoIdPipe) id: string,
    @Query() dto: VersionDto,
  ) {
    return this.service.remove(context, id, dto.version);
  }
  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore a soft-deleted contact' })
  @ApiParam({ name: 'id', description: 'Contact MongoDB identifier' })
  @RequirePermissions('contacts.update')
  restore(
    @WorkspaceContext() context: WorkspaceRequestContext,
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() dto: VersionDto,
  ) {
    return this.service.restore(context, id, dto.version);
  }
  @Post('merge')
  @RequirePermissions('contacts.update')
  merge(@WorkspaceContext() context: WorkspaceRequestContext, @Body() dto: MergeContactsDto) {
    return this.service.merge(context, dto);
  }
  @Post('jobs/import')
  @RequirePermissions('contacts.create')
  importJob(@WorkspaceContext() context: WorkspaceRequestContext, @Body() dto: DataJobDto) {
    return this.service.createJob('import', context, dto.options);
  }
  @Post('jobs/export')
  @RequirePermissions('contacts.read')
  exportJob(@WorkspaceContext() context: WorkspaceRequestContext, @Body() dto: DataJobDto) {
    return this.service.createJob('export', context, dto.options);
  }
  @Post('bulk')
  @RequirePermissions('contacts.update')
  bulk(@WorkspaceContext() context: WorkspaceRequestContext, @Body() dto: BulkOperationDto) {
    return this.service.bulk(context, dto.items, dto.action);
  }
}
