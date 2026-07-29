import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';
const CHANNELS = ['in_app', 'email', 'sms', 'whatsapp', 'push', 'webhook'];
@Schema({ collection: 'notification_definitions', timestamps: true, versionKey: false })
export class NotificationDefinition {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: String, required: true }) key!: string;
  @Prop({ type: [String], enum: CHANNELS, required: true }) channels!: string[];
  @Prop({ type: String, enum: ['immediate', 'digest'], default: 'immediate' })
  deliveryMode!: string;
  @Prop({ type: Boolean, default: false }) consentRequired!: boolean;
  @Prop({ type: Boolean, default: false }) critical!: boolean;
  @Prop({ type: Boolean, default: false }) allowCriticalOverride!: boolean;
  @Prop({ type: MongooseSchema.Types.Mixed, default: null }) escalationPolicy!: Record<
    string,
    unknown
  > | null;
  @Prop({ type: Boolean, default: true }) active!: boolean;
}
export const NotificationDefinitionSchema = SchemaFactory.createForClass(NotificationDefinition);
NotificationDefinitionSchema.index({ workspaceId: 1, key: 1 }, { unique: true });
@Schema({ collection: 'notification_preferences', timestamps: true, versionKey: false })
export class NotificationPreference {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) userId!: Types.ObjectId;
  @Prop({ type: String, required: true }) definitionKey!: string;
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} }) channels!: Record<string, boolean>;
  @Prop({ type: String, enum: ['immediate', 'digest', 'disabled'], default: 'immediate' })
  deliveryMode!: string;
  @Prop({ type: String, default: 'UTC' }) timezone!: string;
  @Prop({ type: String, default: 'en' }) locale!: string;
  @Prop({ type: MongooseSchema.Types.Mixed, default: null }) quietHours!: {
    start: string;
    end: string;
  } | null;
}
export const NotificationPreferenceSchema = SchemaFactory.createForClass(NotificationPreference);
NotificationPreferenceSchema.index(
  { workspaceId: 1, userId: 1, definitionKey: 1 },
  { unique: true },
);
@Schema({ collection: 'notification_templates', timestamps: true, versionKey: false })
export class NotificationTemplate {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: String, required: true }) definitionKey!: string;
  @Prop({ type: String, enum: CHANNELS, required: true }) channel!: string;
  @Prop({ type: String, required: true }) locale!: string;
  @Prop({ type: String, default: '' }) subject!: string;
  @Prop({ type: String, required: true }) body!: string;
}
export const NotificationTemplateSchema = SchemaFactory.createForClass(NotificationTemplate);
NotificationTemplateSchema.index(
  { workspaceId: 1, definitionKey: 1, channel: 1, locale: 1 },
  { unique: true },
);
@Schema({ collection: 'notification_delivery_requests', timestamps: true, versionKey: false })
export class NotificationDeliveryRequest {
  _id!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: String, required: true }) definitionKey!: string;
  @Prop({ type: String, required: true }) channel!: string;
  @Prop({ type: MongooseSchema.Types.ObjectId, default: null })
  recipientUserId!: Types.ObjectId | null;
  @Prop({ type: String, required: true }) destination!: string;
  @Prop({ type: String, required: true }) deduplicationKey!: string;
  @Prop({ type: String, required: true }) correlationId!: string;
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} }) content!: {
    subject?: string;
    body: string;
  };
  @Prop({
    type: String,
    enum: ['queued', 'digest_pending', 'deferred', 'sending', 'delivered', 'failed', 'suppressed'],
    default: 'queued',
  })
  status!: string;
  @Prop({ type: Date, required: true }) deliverAt!: Date;
  @Prop({ type: Date, default: null }) deliveredAt!: Date | null;
  @Prop({ type: Number, default: 0 }) attempts!: number;
  @Prop({ type: String, default: null }) lastError!: string | null;
}
export const NotificationDeliveryRequestSchema = SchemaFactory.createForClass(
  NotificationDeliveryRequest,
);
NotificationDeliveryRequestSchema.index(
  { workspaceId: 1, deduplicationKey: 1, channel: 1, destination: 1 },
  { unique: true },
);
NotificationDeliveryRequestSchema.index({ status: 1, deliverAt: 1 });
@Schema({ collection: 'notification_delivery_attempts', timestamps: true, versionKey: false })
export class NotificationDeliveryAttempt {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) requestId!: Types.ObjectId;
  @Prop({ type: String, required: true }) channel!: string;
  @Prop({ type: Number, required: true }) attempt!: number;
  @Prop({ type: String, required: true }) status!: string;
  @Prop({ type: String, default: null }) providerMessageId!: string | null;
  @Prop({ type: String, default: null }) errorCode!: string | null;
}
export const NotificationDeliveryAttemptSchema = SchemaFactory.createForClass(
  NotificationDeliveryAttempt,
);
@Schema({ collection: 'notification_suppressions', timestamps: true, versionKey: false })
export class NotificationSuppression {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: String, required: true }) channel!: string;
  @Prop({ type: String, required: true }) destination!: string;
  @Prop({ type: String, default: '*' }) definitionKey!: string;
  @Prop({ type: Date, default: null }) expiresAt!: Date | null;
  @Prop({ type: String, required: true }) reason!: string;
}
export const NotificationSuppressionSchema = SchemaFactory.createForClass(NotificationSuppression);
NotificationSuppressionSchema.index({
  workspaceId: 1,
  channel: 1,
  destination: 1,
  definitionKey: 1,
});
