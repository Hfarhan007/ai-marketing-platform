import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import type { CrmEntity } from '../../crm/crm.types.js';

export const CHANNEL_TYPES = [
  'email',
  'whatsapp',
  'sms',
  'facebook_messenger',
  'instagram',
  'website_chat',
] as const;
@Schema({ collection: 'conversations', timestamps: true, versionKey: false })
export class Conversation implements CrmEntity {
  _id!: Types.ObjectId;
  createdAt!: Date;
  updatedAt!: Date;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) createdBy!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) updatedBy!: Types.ObjectId;
  @Prop({ type: Number, default: 0 }) version!: number;
  @Prop({ type: Date, default: null }) deletedAt!: Date | null;
  @Prop({ type: String, required: true, enum: CHANNEL_TYPES }) channelType!: string;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  channelConnectionId!: Types.ObjectId;
  @Prop({ type: String, default: '' }) subject!: string;
  @Prop({ type: String, enum: ['open', 'closed', 'snoozed'], default: 'open' }) status!: string;
  @Prop({ type: Date, default: null }) snoozedUntil!: Date | null;
  @Prop({ type: Date, default: null }) lastMessageAt!: Date | null;
  @Prop({ type: String, default: '' }) lastMessagePreview!: string;
  @Prop({ type: Number, default: 0 }) unreadCount!: number;
  @Prop({ type: [MongooseSchema.Types.ObjectId], default: [] }) participantIds!: Types.ObjectId[];
  @Prop({ type: [MongooseSchema.Types.ObjectId], default: [] }) labelIds!: Types.ObjectId[];
  @Prop({ type: [MongooseSchema.Types.ObjectId], default: [] }) assigneeIds!: Types.ObjectId[];
}
export type ConversationDocument = HydratedDocument<Conversation>;
export const ConversationSchema = SchemaFactory.createForClass(Conversation);
ConversationSchema.index({ workspaceId: 1, status: 1, lastMessageAt: -1 });
ConversationSchema.index({ workspaceId: 1, assigneeIds: 1, lastMessageAt: -1 });
ConversationSchema.index({ workspaceId: 1, subject: 'text', lastMessagePreview: 'text' });

@Schema({ collection: 'messages', timestamps: true, versionKey: false })
export class Message {
  _id!: Types.ObjectId;
  createdAt!: Date;
  updatedAt!: Date;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) conversationId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, default: null })
  senderParticipantId!: Types.ObjectId | null;
  @Prop({ type: MongooseSchema.Types.ObjectId, default: null })
  senderUserId!: Types.ObjectId | null;
  @Prop({ type: String, enum: ['inbound', 'outbound', 'note'], required: true }) direction!: string;
  @Prop({ type: String, enum: ['text', 'html', 'template', 'system'], default: 'text' })
  contentType!: string;
  @Prop({ type: String, default: '', maxlength: 50_000 }) content!: string;
  @Prop({ type: String, default: null }) providerMessageId!: string | null;
  @Prop({ type: String, required: true }) idempotencyKey!: string;
  @Prop({
    type: String,
    enum: ['draft', 'queued', 'sending', 'sent', 'delivered', 'read', 'failed'],
    default: 'queued',
  })
  deliveryState!: string;
  @Prop({ type: Date, default: null }) readAt!: Date | null;
  @Prop({ type: String, default: null }) failureCode!: string | null;
  @Prop({ type: Number, default: 0 }) attemptCount!: number;
  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] }) attachments!: Record<
    string,
    string | number
  >[];
}
export type MessageDocument = HydratedDocument<Message>;
export const MessageSchema = SchemaFactory.createForClass(Message);
MessageSchema.index({ workspaceId: 1, conversationId: 1, createdAt: -1, _id: -1 });
MessageSchema.index(
  { workspaceId: 1, providerMessageId: 1 },
  { unique: true, partialFilterExpression: { providerMessageId: { $type: 'string' } } },
);
MessageSchema.index({ workspaceId: 1, idempotencyKey: 1 }, { unique: true });

@Schema({ collection: 'participants', timestamps: true, versionKey: false })
export class Participant {
  _id!: Types.ObjectId;
  createdAt!: Date;
  updatedAt!: Date;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, default: null }) contactId!: Types.ObjectId | null;
  @Prop({ type: String, required: true }) displayName!: string;
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} }) addresses!: Record<string, string>;
  @Prop({ type: Boolean, default: false }) internal!: boolean;
}
export type ParticipantDocument = HydratedDocument<Participant>;
export const ParticipantSchema = SchemaFactory.createForClass(Participant);
ParticipantSchema.index({ workspaceId: 1, contactId: 1 });

@Schema({ collection: 'channel_connections', timestamps: true, versionKey: false })
export class ChannelConnection {
  _id!: Types.ObjectId;
  createdAt!: Date;
  updatedAt!: Date;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: String, required: true, enum: CHANNEL_TYPES }) type!: string;
  @Prop({ type: String, required: true }) displayName!: string;
  @Prop({ type: String, enum: ['active', 'disabled', 'error'], default: 'active' }) status!: string;
  @Prop({ type: String, required: true, select: false }) credentialsEncrypted!: string;
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} }) publicConfiguration!: Record<
    string,
    string | boolean
  >;
}
export type ChannelConnectionDocument = HydratedDocument<ChannelConnection>;
export const ChannelConnectionSchema = SchemaFactory.createForClass(ChannelConnection);
ChannelConnectionSchema.index({ workspaceId: 1, type: 1, status: 1 });

@Schema({ collection: 'message_templates', timestamps: true, versionKey: false })
export class MessageTemplate {
  _id!: Types.ObjectId;
  createdAt!: Date;
  updatedAt!: Date;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: String, required: true }) name!: string;
  @Prop({ type: String, required: true }) body!: string;
  @Prop({ type: String, default: 'text' }) contentType!: string;
  @Prop({ type: String, default: 'active' }) status!: string;
}
export const MessageTemplateSchema = SchemaFactory.createForClass(MessageTemplate);
MessageTemplateSchema.index({ workspaceId: 1, name: 1 }, { unique: true });

@Schema({ collection: 'conversation_assignments', timestamps: true, versionKey: false })
export class ConversationAssignment {
  _id!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) conversationId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) userId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) assignedBy!: Types.ObjectId;
  @Prop({ type: Date, default: null }) unassignedAt!: Date | null;
}
export const ConversationAssignmentSchema = SchemaFactory.createForClass(ConversationAssignment);
ConversationAssignmentSchema.index(
  { workspaceId: 1, conversationId: 1, userId: 1 },
  { unique: true, partialFilterExpression: { unassignedAt: null } },
);

@Schema({ collection: 'conversation_labels', timestamps: true, versionKey: false })
export class ConversationLabel {
  _id!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: String, required: true }) name!: string;
  @Prop({ type: String, default: '#64748b' }) color!: string;
}
export const ConversationLabelSchema = SchemaFactory.createForClass(ConversationLabel);
ConversationLabelSchema.index({ workspaceId: 1, name: 1 }, { unique: true });
