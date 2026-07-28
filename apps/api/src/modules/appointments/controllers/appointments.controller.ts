import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequireWorkspace } from '../../../common/decorators/require-workspace.decorator.js'; import { WorkspaceContext } from '../../../common/decorators/workspace-context.decorator.js'; import { ParseMongoIdPipe } from '../../../common/pipes/parse-mongo-id.pipe.js'; import type { WorkspaceRequestContext } from '../../../common/types/workspace-context.js';
import { CrmListQueryDto } from '../../crm/crm.dto.js'; import { RequirePermissions } from '../../permissions/decorators/require-permissions.decorator.js';
import { CancelAppointmentDto, CreateAppointmentDto, RescheduleAppointmentDto } from '../dto/appointment.dto.js'; import { AppointmentsService } from '../services/appointments.service.js';
@ApiTags('appointments') @Controller('appointments') @RequireWorkspace()
export class AppointmentsController {
  constructor(private readonly service: AppointmentsService) {}
  @Get() @RequirePermissions('appointments.read') list(@WorkspaceContext() c:WorkspaceRequestContext,@Query() q:CrmListQueryDto){return this.service.list(c,q)}
  @Get(':id') @RequirePermissions('appointments.read') get(@WorkspaceContext() c:WorkspaceRequestContext,@Param('id',ParseMongoIdPipe) id:string){return this.service.get(c,id)}
  @Post() @RequirePermissions('appointments.manage') create(@WorkspaceContext() c:WorkspaceRequestContext,@Body() d:CreateAppointmentDto){return this.service.create(c,d)}
  @Patch(':id/reschedule') @RequirePermissions('appointments.manage') reschedule(@WorkspaceContext() c:WorkspaceRequestContext,@Param('id',ParseMongoIdPipe) id:string,@Body() d:RescheduleAppointmentDto){return this.service.reschedule(c,id,d)}
  @Post(':id/cancel') @RequirePermissions('appointments.manage') cancel(@WorkspaceContext() c:WorkspaceRequestContext,@Param('id',ParseMongoIdPipe) id:string,@Body() d:CancelAppointmentDto){return this.service.cancel(c,id,d)}
}
