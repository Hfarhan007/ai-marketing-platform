import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common'; import { ApiTags } from '@nestjs/swagger';
import { RequireWorkspace } from '../../../common/decorators/require-workspace.decorator.js'; import { WorkspaceContext } from '../../../common/decorators/workspace-context.decorator.js'; import { ParseMongoIdPipe } from '../../../common/pipes/parse-mongo-id.pipe.js'; import type { WorkspaceRequestContext } from '../../../common/types/workspace-context.js';
import { BulkOperationDto, CrmListQueryDto, DataJobDto, VersionDto } from '../../crm/crm.dto.js'; import { RequirePermissions } from '../../permissions/decorators/require-permissions.decorator.js'; import { CreateCompanyDto, UpdateCompanyDto } from '../dto/company.dto.js'; import { CompaniesService } from '../services/companies.service.js';
@ApiTags('companies') @Controller('companies') @RequireWorkspace() export class CompaniesController {
 constructor(private readonly s: CompaniesService) {}
 @Get() @RequirePermissions('companies.read') list(@WorkspaceContext() c: WorkspaceRequestContext,@Query() q: CrmListQueryDto){return this.s.list(c,q)}
 @Get(':id') @RequirePermissions('companies.read') get(@WorkspaceContext() c: WorkspaceRequestContext,@Param('id',ParseMongoIdPipe) id:string){return this.s.get(c,id)}
 @Post() @RequirePermissions('companies.create') create(@WorkspaceContext() c: WorkspaceRequestContext,@Body() d:CreateCompanyDto){return this.s.create(c,d)}
 @Patch(':id') @RequirePermissions('companies.update') update(@WorkspaceContext() c: WorkspaceRequestContext,@Param('id',ParseMongoIdPipe) id:string,@Body() d:UpdateCompanyDto){return this.s.update(c,id,d)}
 @Delete(':id') @RequirePermissions('companies.delete') remove(@WorkspaceContext() c: WorkspaceRequestContext,@Param('id',ParseMongoIdPipe) id:string,@Query() d:VersionDto){return this.s.remove(c,id,d.version)}
 @Post(':id/restore') @RequirePermissions('companies.update') restore(@WorkspaceContext() c: WorkspaceRequestContext,@Param('id',ParseMongoIdPipe) id:string,@Body() d:VersionDto){return this.s.restore(c,id,d.version)}
 @Post('jobs/import') @RequirePermissions('companies.create') imp(@WorkspaceContext() c:WorkspaceRequestContext,@Body() d:DataJobDto){return this.s.createJob('import',c,d.options)}
 @Post('jobs/export') @RequirePermissions('companies.read') exp(@WorkspaceContext() c:WorkspaceRequestContext,@Body() d:DataJobDto){return this.s.createJob('export',c,d.options)}
 @Post('bulk') @RequirePermissions('companies.update') bulk(@WorkspaceContext() c:WorkspaceRequestContext,@Body() d:BulkOperationDto){return this.s.bulk(c,d.items,d.action)}
}
