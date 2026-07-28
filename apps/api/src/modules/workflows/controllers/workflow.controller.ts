import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';
import { RequireWorkspace } from '../../../common/decorators/require-workspace.decorator.js';
import { WorkspaceContext } from '../../../common/decorators/workspace-context.decorator.js';
import { ParseMongoIdPipe } from '../../../common/pipes/parse-mongo-id.pipe.js';
import type { WorkspaceRequestContext } from '../../../common/types/workspace-context.js';
import { RequirePermissions } from '../../permissions/decorators/require-permissions.decorator.js';
import { CreateWorkflowDto, TriggerWorkflowDto, UpdateDraftDto } from '../dto/workflow.dto.js';
import { WorkflowSchedulerService } from '../services/workflow-scheduler.service.js';
import { WorkflowService } from '../services/workflow.service.js';
class ScheduleDto {
  @IsString() @Matches(/^[\d*/?,\-\s]+$/) cron!: string;
  @IsString() timezone!: string;
}
@ApiTags('workflows')
@Controller('workflows')
@RequireWorkspace()
export class WorkflowController {
  constructor(
    private readonly service: WorkflowService,
    private readonly scheduler: WorkflowSchedulerService,
  ) {}
  @Post() @RequirePermissions('workflows.manage') create(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Body() d: CreateWorkflowDto,
  ) {
    return this.service.create(c, d);
  }
  @Put(':id/draft') @RequirePermissions('workflows.manage') draft(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() d: UpdateDraftDto,
  ) {
    return this.service.updateDraft(c, id, d);
  }
  @Post(':id/publish') @RequirePermissions('workflows.publish') publish(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Param('id', ParseMongoIdPipe) id: string,
  ) {
    return this.service.publish(c, id);
  }
  @Post(':id/trigger') @RequirePermissions('workflows.run') manual(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() d: TriggerWorkflowDto,
  ) {
    return this.service.manual(c, id, d);
  }
  @Post(':id/webhook') @RequirePermissions('workflows.run') webhook(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() d: TriggerWorkflowDto,
  ) {
    return this.service.trigger(c.workspaceId, id, 'trigger.webhook', d);
  }
  @Post(':id/schedule') @RequirePermissions('workflows.manage') schedule(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() d: ScheduleDto,
  ) {
    return this.scheduler.schedule(c.workspaceId, id, d.cron, d.timezone);
  }
  @Post('runs/:id/:command') @RequirePermissions('workflows.manage') command(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Param('id', ParseMongoIdPipe) id: string,
    @Param('command') command: 'cancel' | 'pause' | 'resume',
  ) {
    return this.service.command(c, id, command);
  }
  @Post('runs/:id/recover/:nodeId') @RequirePermissions('workflows.manage') recover(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Param('id', ParseMongoIdPipe) id: string,
    @Param('nodeId') nodeId: string,
  ) {
    return this.service.recover(c, id, nodeId);
  }
  @Get('runs/:id/history') @RequirePermissions('workflows.read') history(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Param('id', ParseMongoIdPipe) id: string,
  ) {
    return this.service.history(c, id);
  }
}
