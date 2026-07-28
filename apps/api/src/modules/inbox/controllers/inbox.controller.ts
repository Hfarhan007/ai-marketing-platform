import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequireWorkspace } from '../../../common/decorators/require-workspace.decorator.js';
import { WorkspaceContext } from '../../../common/decorators/workspace-context.decorator.js';
import { ParseMongoIdPipe } from '../../../common/pipes/parse-mongo-id.pipe.js';
import type { WorkspaceRequestContext } from '../../../common/types/workspace-context.js';
import { RequirePermissions } from '../../permissions/decorators/require-permissions.decorator.js';
import {
  AssignmentDto,
  ConversationActionDto,
  CursorQueryDto,
  DeliveryUpdateDto,
  InboundMessageDto,
  LabelsDto,
  SendMessageDto,
} from '../dto/inbox.dto.js';
import { InboxService } from '../services/inbox.service.js';
@ApiTags('inbox')
@Controller('inbox')
@RequireWorkspace()
export class InboxController {
  constructor(private readonly s: InboxService) {}
  @Get('conversations') @RequirePermissions('inbox.read') conversations(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Query() q: CursorQueryDto,
  ) {
    return this.s.conversations(c, q);
  }
  @Get('conversations/:id/messages') @RequirePermissions('inbox.read') messages(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Param('id', ParseMongoIdPipe) id: string,
    @Query() q: CursorQueryDto,
  ) {
    return this.s.messages(c, id, q);
  }
  @Post('conversations/:id/messages') @RequirePermissions('inbox.reply') send(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() d: SendMessageDto,
  ) {
    return this.s.send(c, id, d);
  }
  @Post('conversations/:id/notes') @RequirePermissions('inbox.reply') note(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() d: SendMessageDto,
  ) {
    return this.s.send(c, id, d, true);
  }
  @Post('conversations/:id/:action') @RequirePermissions('inbox.manage') state(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Param('id', ParseMongoIdPipe) id: string,
    @Param('action') action: 'close' | 'reopen' | 'snooze',
    @Body() d: ConversationActionDto,
  ) {
    return this.s.state(c, id, action, d);
  }
  @Post('conversations/:id/read') @RequirePermissions('inbox.read') read(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Param('id', ParseMongoIdPipe) id: string,
  ) {
    return this.s.markRead(c, id);
  }
  @Post('conversations/:id/assign') @RequirePermissions('inbox.manage') assign(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() d: AssignmentDto,
  ) {
    return this.s.assign(c, id, d);
  }
  @Post('conversations/:id/labels') @RequirePermissions('inbox.manage') labels(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() d: LabelsDto,
  ) {
    return this.s.labels(c, id, d);
  }
  @Post('channels/inbound') @RequirePermissions('inbox.manage') inbound(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Body() d: InboundMessageDto,
  ) {
    if (d.workspaceId !== c.workspaceId) throw new ForbiddenException('Workspace mismatch');
    return this.s.inbound(d);
  }
  @Patch('messages/:id/delivery') @RequirePermissions('inbox.manage') delivery(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() d: DeliveryUpdateDto,
  ) {
    return this.s.delivery(c.workspaceId, id, d);
  }
  @Post('messages/:id/retry') @RequirePermissions('inbox.reply') retry(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Param('id', ParseMongoIdPipe) id: string,
  ) {
    return this.s.retry(c, id);
  }
}
