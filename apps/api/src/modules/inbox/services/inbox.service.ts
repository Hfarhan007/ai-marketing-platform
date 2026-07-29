import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { Types } from 'mongoose';
import type { WorkspaceRequestContext } from '../../../common/types/workspace-context.js';
import { TransactionManagerService } from '../../../database/transactions/transaction-manager.service.js';
import { OutboxService } from '../../../events/outbox.service.js';
import { CrmEventService } from '../../crm/crm-event.service.js';
import type {
  AssignmentDto,
  ConversationActionDto,
  CursorQueryDto,
  DeliveryUpdateDto,
  InboundMessageDto,
  LabelsDto,
  SendMessageDto,
} from '../dto/inbox.dto.js';
import { InboxRealtimeService } from '../realtime/inbox-realtime.service.js';
import { InboxRepository } from '../repositories/inbox.repository.js';
import type { Conversation, Message } from '../schemas/inbox.schemas.js';
import { ContentSanitizerService } from './content-sanitizer.service.js';
export const OUTBOUND_MESSAGES_QUEUE = 'outbound-messages';
const mapMessage = (m: Message) => ({
  id: String(m._id),
  conversationId: String(m.conversationId),
  direction: m.direction,
  contentType: m.contentType,
  content: m.content,
  attachments: m.attachments,
  deliveryState: m.deliveryState,
  readAt: m.readAt,
  failureCode: m.failureCode,
  attemptCount: m.attemptCount,
  createdAt: m.createdAt,
});
const mapConversation = (c: Conversation) => ({
  id: String(c._id),
  channelType: c.channelType,
  subject: c.subject,
  status: c.status,
  snoozedUntil: c.snoozedUntil,
  lastMessageAt: c.lastMessageAt,
  lastMessagePreview: c.lastMessagePreview,
  unreadCount: c.unreadCount,
  participantIds: c.participantIds.map(String),
  labelIds: c.labelIds.map(String),
  assigneeIds: c.assigneeIds.map(String),
  version: c.version,
});
@Injectable()
export class InboxService {
  constructor(
    private readonly repository: InboxRepository,
    private readonly transactions: TransactionManagerService,
    private readonly sanitizer: ContentSanitizerService,
    private readonly realtime: InboxRealtimeService,
    private readonly events: CrmEventService,
    private readonly outbox: OutboxService,
    @InjectQueue(OUTBOUND_MESSAGES_QUEUE) private readonly queue: Queue,
  ) {}
  async conversations(c: WorkspaceRequestContext, q: CursorQueryDto) {
    const p = await this.repository.conversationPage(c.workspaceId, q.cursor, q.limit, q.search);
    return { ...p, items: p.items.map(mapConversation) };
  }
  async messages(c: WorkspaceRequestContext, id: string, q: CursorQueryDto) {
    await this.repository.conversation(c.workspaceId, id);
    const p = await this.repository.messagePage(c.workspaceId, id, q.cursor, q.limit);
    return { ...p, items: p.items.map(mapMessage) };
  }
  async inbound(dto: InboundMessageDto) {
    const result = await this.transactions.run(async (session) => {
      const duplicate = await this.repository.findProviderMessage(
        dto.workspaceId,
        dto.providerMessageId,
        session,
      );
      if (duplicate) return { message: duplicate, duplicate: true };
      await this.repository.conversation(dto.workspaceId, dto.conversationId, session);
      const content = this.sanitizer.sanitize(dto.content, dto.contentType);
      const message = await this.repository.createMessage(
        {
          workspaceId: new Types.ObjectId(dto.workspaceId),
          conversationId: new Types.ObjectId(dto.conversationId),
          senderParticipantId: dto.participantId ? new Types.ObjectId(dto.participantId) : null,
          direction: 'inbound',
          contentType: dto.contentType,
          content,
          providerMessageId: dto.providerMessageId,
          idempotencyKey: `provider:${dto.providerMessageId}`,
          deliveryState: 'delivered',
          attachments: dto.attachments,
        },
        session,
      );
      await this.repository.updateConversation(
        dto.workspaceId,
        dto.conversationId,
        {
          $set: {
            lastMessageAt: message.createdAt,
            lastMessagePreview: content.slice(0, 200),
            status: 'open',
          },
          $inc: { unreadCount: 1, version: 1 },
        },
        session,
      );
      await this.outbox.append(
        {
          eventId: `message:${dto.providerMessageId}`,
          eventType: 'message.received',
          aggregateType: 'conversation',
          aggregateId: dto.conversationId,
          workspaceId: dto.workspaceId,
          payload: {
            messageId: String(message._id),
            conversationId: dto.conversationId,
            contentType: dto.contentType,
          },
          metadata: { providerMessageId: dto.providerMessageId },
          correlationId: `provider:${dto.providerMessageId}`,
        },
        session,
      );
      return { message, duplicate: false };
    });
    if (!result.duplicate)
      this.realtime.conversation(
        dto.workspaceId,
        dto.conversationId,
        'message.created',
        mapMessage(result.message),
      );
    return { duplicate: result.duplicate, message: mapMessage(result.message) };
  }
  async send(
    c: WorkspaceRequestContext,
    conversationId: string,
    dto: SendMessageDto,
    note = false,
  ) {
    const result = await this.transactions.run(async (session) => {
      const existing = await this.repository.findIdempotent(
        c.workspaceId,
        dto.idempotencyKey,
        session,
      );
      if (existing) return existing;
      await this.repository.conversation(c.workspaceId, conversationId, session);
      const content = this.sanitizer.sanitize(dto.content, dto.contentType);
      const state = dto.draft ? 'draft' : 'queued';
      const message = await this.repository.createMessage(
        {
          workspaceId: new Types.ObjectId(c.workspaceId),
          conversationId: new Types.ObjectId(conversationId),
          senderUserId: new Types.ObjectId(c.userId),
          direction: note ? 'note' : 'outbound',
          contentType: dto.contentType,
          content,
          idempotencyKey: dto.idempotencyKey,
          deliveryState: note ? 'sent' : state,
          attachments: dto.attachments,
        },
        session,
      );
      await this.repository.updateConversation(
        c.workspaceId,
        conversationId,
        {
          $set: { lastMessageAt: message.createdAt, lastMessagePreview: content.slice(0, 200) },
          $inc: { version: 1 },
        },
        session,
      );
      await this.events.record({
        workspaceId: c.workspaceId,
        actorId: c.userId,
        entityType: 'conversation',
        entityId: conversationId,
        action: note ? 'note_added' : 'message_created',
        session,
      });
      return message;
    });
    if (!dto.draft && !note)
      await this.queue.add(
        'message.deliver',
        { workspaceId: c.workspaceId, messageId: String(result._id), conversationId },
        { jobId: `deliver-${String(result._id)}`, priority: 1 },
      );
    this.realtime.conversation(
      c.workspaceId,
      conversationId,
      'message.created',
      mapMessage(result),
    );
    return mapMessage(result);
  }
  async state(
    c: WorkspaceRequestContext,
    id: string,
    action: 'close' | 'reopen' | 'snooze',
    dto: ConversationActionDto,
  ) {
    const update =
      action === 'close'
        ? { status: 'closed', snoozedUntil: null }
        : action === 'reopen'
          ? { status: 'open', snoozedUntil: null }
          : { status: 'snoozed', snoozedUntil: dto.snoozedUntil };
    if (action === 'snooze' && !dto.snoozedUntil)
      throw new BadRequestException('snoozedUntil is required');
    const value = await this.repository.updateConversation(c.workspaceId, id, {
      $set: update,
      $inc: { version: 1 },
    });
    if (!value) throw new NotFoundException('Conversation not found');
    await this.events.record({
      workspaceId: c.workspaceId,
      actorId: c.userId,
      entityType: 'conversation',
      entityId: id,
      action,
    });
    this.realtime.conversation(c.workspaceId, id, 'conversation.updated', mapConversation(value));
    return mapConversation(value);
  }
  async markRead(c: WorkspaceRequestContext, id: string) {
    const value = await this.repository.updateConversation(c.workspaceId, id, {
      $set: { unreadCount: 0 },
      $inc: { version: 1 },
    });
    if (!value) throw new NotFoundException('Conversation not found');
    this.realtime.conversation(c.workspaceId, id, 'conversation.read', {
      conversationId: id,
      userId: c.userId,
    });
    return mapConversation(value);
  }
  async assign(c: WorkspaceRequestContext, id: string, dto: AssignmentDto) {
    await this.repository.conversation(c.workspaceId, id);
    const value = await this.repository.assign(c.workspaceId, id, dto.userId, c.userId);
    if (!value) throw new NotFoundException('Conversation not found');
    await this.events.record({
      workspaceId: c.workspaceId,
      actorId: c.userId,
      entityType: 'conversation',
      entityId: id,
      action: 'assigned',
      metadata: { assigneeId: dto.userId },
    });
    return mapConversation(value);
  }
  async labels(c: WorkspaceRequestContext, id: string, dto: LabelsDto) {
    await this.repository.conversation(c.workspaceId, id);
    const value = await this.repository.setLabels(c.workspaceId, id, dto.labelIds);
    if (!value) throw new NotFoundException('Conversation not found');
    return mapConversation(value);
  }
  async delivery(workspaceId: string, messageId: string, dto: DeliveryUpdateDto) {
    const message = await this.repository.updateMessage(workspaceId, messageId, {
      $set: {
        deliveryState: dto.state,
        ...(dto.failureCode ? { failureCode: dto.failureCode } : {}),
      },
      $inc: { attemptCount: dto.state === 'sending' ? 1 : 0 },
    });
    if (!message) throw new NotFoundException('Message not found');
    this.realtime.conversation(
      workspaceId,
      String(message.conversationId),
      'message.delivery',
      mapMessage(message),
    );
    return mapMessage(message);
  }
  async retry(c: WorkspaceRequestContext, messageId: string) {
    const message = await this.repository.retryFailedMessage(c.workspaceId, messageId);
    if (!message) throw new NotFoundException('Failed message not found');
    await this.queue.add(
      'message.deliver',
      { workspaceId: c.workspaceId, messageId, conversationId: String(message.conversationId) },
      { jobId: `retry-${messageId}-${message.attemptCount}`, priority: 1 },
    );
    return mapMessage(message);
  }
}
