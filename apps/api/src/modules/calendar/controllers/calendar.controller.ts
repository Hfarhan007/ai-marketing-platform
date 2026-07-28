import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { RequireWorkspace } from '../../../common/decorators/require-workspace.decorator.js';
import { WorkspaceContext } from '../../../common/decorators/workspace-context.decorator.js';
import type { WorkspaceRequestContext } from '../../../common/types/workspace-context.js';
import { RequirePermissions } from '../../permissions/decorators/require-permissions.decorator.js';
import { CalendarService } from '../services/calendar.service.js';
export class CalendarRangeDto { @IsString() start!: string; @IsString() end!: string; }
@ApiTags('calendar') @Controller('calendar') @RequireWorkspace()
export class CalendarController {
  constructor(private readonly service: CalendarService) {}
  @Get() @RequirePermissions('calendar.read')
  range(@WorkspaceContext() context: WorkspaceRequestContext, @Query() query: CalendarRangeDto) { return this.service.range(context, query.start, query.end); }
}
