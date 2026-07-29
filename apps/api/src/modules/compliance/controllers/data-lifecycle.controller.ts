import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { ParseMongoIdPipe } from '../../../common/pipes/parse-mongo-id.pipe.js';
import { RequireWorkspace } from '../../../common/decorators/require-workspace.decorator.js';
import { WorkspaceContext } from '../../../common/decorators/workspace-context.decorator.js';
import type { WorkspaceRequestContext } from '../../../common/types/workspace-context.js';
import { RequirePermissions } from '../../permissions/decorators/require-permissions.decorator.js';
import { DataLifecycleService } from '../data-lifecycle.service.js';
import {
  CreateLegalHoldDto,
  RunRetentionDto,
  ScheduleDeletionDto,
  UpdateLifecyclePolicyDto,
} from '../dto/data-lifecycle.dto.js';
import { DATA_CLASSES, type DataClass } from '../data-lifecycle.types.js';
import { BadRequestException } from '@nestjs/common';

@Controller('data-lifecycle')
@RequireWorkspace()
@RequirePermissions('admin.access')
export class DataLifecycleController {
  constructor(private readonly lifecycle: DataLifecycleService) {}

  @Get('policies')
  policies(@WorkspaceContext() context: WorkspaceRequestContext) {
    return this.lifecycle.listPolicies(context.workspaceId);
  }
  @Put('policies')
  updatePolicy(
    @WorkspaceContext() context: WorkspaceRequestContext,
    @Body() dto: UpdateLifecyclePolicyDto,
  ) {
    return this.lifecycle.updatePolicy(context.workspaceId, context.userId, dto);
  }
  @Post('runs')
  run(@WorkspaceContext() context: WorkspaceRequestContext, @Body() dto: RunRetentionDto) {
    return this.lifecycle.schedule(
      context.workspaceId,
      context.userId,
      dto.dryRun,
      dto.idempotencyKey,
    );
  }
  @Get('manifests/:id')
  manifest(
    @WorkspaceContext() context: WorkspaceRequestContext,
    @Param('id', ParseMongoIdPipe) id: string,
  ) {
    return this.lifecycle.getManifest(context.workspaceId, id);
  }
  @Post('manifests/:id/retry')
  retry(
    @WorkspaceContext() context: WorkspaceRequestContext,
    @Param('id', ParseMongoIdPipe) id: string,
  ) {
    return this.lifecycle.retry(context.workspaceId, id, context.userId);
  }
  @Post('legal-holds')
  hold(@WorkspaceContext() context: WorkspaceRequestContext, @Body() dto: CreateLegalHoldDto) {
    return this.lifecycle.createHold(context.workspaceId, context.userId, dto);
  }
  @Post('legal-holds/:id/release')
  releaseHold(
    @WorkspaceContext() context: WorkspaceRequestContext,
    @Param('id', ParseMongoIdPipe) id: string,
  ) {
    return this.lifecycle.releaseHold(context.workspaceId, id);
  }
  @Post(':dataClass/:recordId/restore')
  restore(
    @WorkspaceContext() context: WorkspaceRequestContext,
    @Param('dataClass') dataClass: string,
    @Param('recordId') recordId: string,
  ) {
    if (!DATA_CLASSES.includes(dataClass as DataClass))
      throw new BadRequestException('Unknown data class');
    return this.lifecycle.restore(context.workspaceId, dataClass as DataClass, recordId);
  }
  @Post('scheduled-deletions')
  scheduleDeletion(
    @WorkspaceContext() context: WorkspaceRequestContext,
    @Body() dto: ScheduleDeletionDto,
  ) {
    return this.lifecycle.scheduleDeletion(context.workspaceId, dto.dataClass, dto.recordId);
  }
}
