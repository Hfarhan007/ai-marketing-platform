import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PlatformAdminOperation } from '../common/decorators/platform-admin-operation.decorator.js';
import { RequirePermissions } from '../modules/permissions/decorators/require-permissions.decorator.js';
import { OutboxService } from './outbox.service.js';
@ApiTags('event administration')
@Controller('admin/events')
@PlatformAdminOperation()
@RequirePermissions('admin.access')
export class EventAdminController {
  constructor(private readonly outbox: OutboxService) {}
  @Get('metrics') metrics() {
    return this.outbox.metrics();
  }
  @Post(':eventId/replay') async replay(@Param('eventId') eventId: string) {
    const result = await this.outbox.replay(eventId);
    return { replayed: result.modifiedCount === 1, eventId };
  }
}
