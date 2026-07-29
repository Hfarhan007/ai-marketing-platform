import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { RequirePermissions } from '../../permissions/decorators/require-permissions.decorator.js';
import { RequireWorkspace } from '../../../common/decorators/require-workspace.decorator.js';
import { WorkspaceContext } from '../../../common/decorators/workspace-context.decorator.js';
import type { WorkspaceRequestContext } from '../../../common/types/workspace-context.js';
import { ParseMongoIdPipe } from '../../../common/pipes/parse-mongo-id.pipe.js';
import { SagaService } from '../saga.service.js';
import { SagaResumeDto, SagaSignalDto, StartSagaDto } from '../dto/saga.dto.js';

@Controller('sagas')
@RequireWorkspace()
export class SagaController {
  constructor(private readonly sagas: SagaService) {}

  @Post()
  @RequirePermissions('admin.access')
  start(@WorkspaceContext() context: WorkspaceRequestContext, @Body() dto: StartSagaDto) {
    return this.sagas.start({ workspaceId: context.workspaceId, ...dto });
  }

  @Get('metrics')
  @RequirePermissions('admin.access')
  metrics(@WorkspaceContext() context: WorkspaceRequestContext) {
    return this.sagas.metrics(context.workspaceId);
  }

  @Get(':id')
  @RequirePermissions('admin.access')
  get(
    @WorkspaceContext() context: WorkspaceRequestContext,
    @Param('id', ParseMongoIdPipe) id: string,
  ) {
    return this.sagas.get(context.workspaceId, id);
  }

  @Post(':id/cancel')
  @RequirePermissions('admin.access')
  cancel(
    @WorkspaceContext() context: WorkspaceRequestContext,
    @Param('id', ParseMongoIdPipe) id: string,
  ) {
    return this.sagas.cancel(context.workspaceId, id, context.userId);
  }

  @Post(':id/retry')
  @RequirePermissions('admin.access')
  retry(
    @WorkspaceContext() context: WorkspaceRequestContext,
    @Param('id', ParseMongoIdPipe) id: string,
  ) {
    return this.sagas.operatorRetry(context.workspaceId, id, context.userId);
  }

  @Post(':id/resume')
  @RequirePermissions('admin.access')
  resume(
    @WorkspaceContext() context: WorkspaceRequestContext,
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() dto: SagaResumeDto,
  ) {
    return this.sagas.operatorResume(context.workspaceId, id, context.userId, dto.step);
  }

  @Post(':id/signal')
  @RequirePermissions('admin.access')
  signal(
    @WorkspaceContext() context: WorkspaceRequestContext,
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() dto: SagaSignalDto,
  ) {
    return this.sagas.signal({ workspaceId: context.workspaceId, sagaId: id, ...dto });
  }
}
