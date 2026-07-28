import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { ClientSession, Model } from 'mongoose';
import { Types } from 'mongoose';
import {
  Conversation,
  type ConversationDocument,
  ConversationAssignment,
  ConversationLabel,
  Message,
  type MessageDocument,
} from '../schemas/inbox.schemas.js';
@Injectable()
export class InboxRepository {
  constructor(
    @InjectModel(Conversation.name) private readonly conversations: Model<ConversationDocument>,
    @InjectModel(Message.name) private readonly messages: Model<MessageDocument>,
    @InjectModel(ConversationAssignment.name)
    private readonly assignments: Model<ConversationAssignment>,
    @InjectModel(ConversationLabel.name) private readonly labels: Model<ConversationLabel>,
  ) {}
  async conversation(workspaceId: string, id: string, session?: ClientSession) {
    const value = await this.conversations
      .findOne({
        _id: new Types.ObjectId(id),
        workspaceId: new Types.ObjectId(workspaceId),
        deletedAt: null,
      })
      .session(session ?? null)
      .lean<Conversation>()
      .exec();
    if (!value) throw new NotFoundException('Conversation not found');
    return value;
  }
  findProviderMessage(workspaceId: string, providerMessageId: string, session?: ClientSession) {
    return this.messages
      .findOne({ workspaceId: new Types.ObjectId(workspaceId), providerMessageId })
      .session(session ?? null)
      .lean<Message>()
      .exec();
  }
  findIdempotent(workspaceId: string, key: string, session?: ClientSession) {
    return this.messages
      .findOne({ workspaceId: new Types.ObjectId(workspaceId), idempotencyKey: key })
      .session(session ?? null)
      .lean<Message>()
      .exec();
  }
  async createMessage(input: object, session?: ClientSession) {
    const value = new this.messages(input);
    await value.save(session ? { session } : {});
    return value.toObject();
  }
  updateConversation(workspaceId: string, id: string, update: object, session?: ClientSession) {
    return this.conversations
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          workspaceId: new Types.ObjectId(workspaceId),
          deletedAt: null,
        },
        update,
        { new: true, session: session ?? null },
      )
      .lean<Conversation>()
      .exec();
  }
  updateMessage(workspaceId: string, id: string, update: object) {
    return this.messages
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), workspaceId: new Types.ObjectId(workspaceId) },
        update,
        { new: true },
      )
      .lean<Message>()
      .exec();
  }
  retryFailedMessage(workspaceId: string, id: string) {
    return this.messages
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          workspaceId: new Types.ObjectId(workspaceId),
          deliveryState: 'failed',
        },
        { $set: { deliveryState: 'queued', failureCode: null } },
        { new: true },
      )
      .lean<Message>()
      .exec();
  }
  async messagePage(
    workspaceId: string,
    conversationId: string,
    cursor: string | undefined,
    limit: number,
  ) {
    const filter = {
      workspaceId: new Types.ObjectId(workspaceId),
      conversationId: new Types.ObjectId(conversationId),
      ...(cursor ? { _id: { $lt: new Types.ObjectId(cursor) } } : {}),
    };
    const items = await this.messages
      .find(filter)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .lean<Message[]>()
      .exec();
    const hasMore = items.length > limit;
    if (hasMore) items.pop();
    return { items, nextCursor: hasMore ? String(items.at(-1)?._id) : null };
  }
  async conversationPage(
    workspaceId: string,
    cursor: string | undefined,
    limit: number,
    search?: string,
  ) {
    const filter: Record<string, unknown> = {
      workspaceId: new Types.ObjectId(workspaceId),
      deletedAt: null,
      ...(cursor ? { _id: { $lt: new Types.ObjectId(cursor) } } : {}),
      ...(search ? { $text: { $search: search } } : {}),
    };
    const items = await this.conversations
      .find(filter)
      .sort({ lastMessageAt: -1, _id: -1 })
      .limit(limit + 1)
      .lean<Conversation[]>()
      .exec();
    const hasMore = items.length > limit;
    if (hasMore) items.pop();
    return { items, nextCursor: hasMore ? String(items.at(-1)?._id) : null };
  }
  async assign(workspaceId: string, conversationId: string, userId: string, actorId: string) {
    await this.assignments.updateOne(
      {
        workspaceId: new Types.ObjectId(workspaceId),
        conversationId: new Types.ObjectId(conversationId),
        userId: new Types.ObjectId(userId),
        unassignedAt: null,
      },
      { $setOnInsert: { assignedBy: new Types.ObjectId(actorId) } },
      { upsert: true },
    );
    return this.updateConversation(workspaceId, conversationId, {
      $addToSet: { assigneeIds: new Types.ObjectId(userId) },
    });
  }
  async setLabels(workspaceId: string, conversationId: string, labelIds: string[]) {
    const count = await this.labels.countDocuments({
      _id: { $in: labelIds.map((id) => new Types.ObjectId(id)) },
      workspaceId: new Types.ObjectId(workspaceId),
    });
    if (count !== labelIds.length) throw new NotFoundException('One or more labels do not exist');
    return this.updateConversation(workspaceId, conversationId, {
      $set: { labelIds: labelIds.map((id) => new Types.ObjectId(id)) },
    });
  }
}
