import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types, type HydratedDocument } from 'mongoose';

@Schema({ collection: 'outbox_events', timestamps: false, versionKey: false })
export class OutboxEvent {
  _id!: Types.ObjectId;
  @Prop({ type: String, required: true, unique: true }) eventId!: string;
  @Prop({ type: String, required: true }) eventType!: string;
  @Prop({ type: String, required: true }) aggregateType!: string;
  @Prop({ type: String, required: true }) aggregateId!: string;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.Mixed, required: true }) payload!: Record<string, unknown>;
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} }) metadata!: Record<string, unknown>;
  @Prop({ type: String, required: true }) correlationId!: string;
  @Prop({ type: String, default: null }) causationId!: string | null;
  @Prop({ type: Date, required: true }) occurredAt!: Date;
  @Prop({ type: Date, required: true }) availableAt!: Date;
  @Prop({ type: Date, default: null }) processedAt!: Date | null;
  @Prop({ type: Number, default: 0 }) attempts!: number;
  @Prop({
    type: String,
    enum: ['pending', 'publishing', 'processed', 'failed', 'quarantined'],
    default: 'pending',
  })
  status!: string;
  @Prop({ type: String, default: null }) lastError!: string | null;
  @Prop({ type: Date, default: null }) archivedAt!: Date | null;
}
export const OutboxEventSchema = SchemaFactory.createForClass(OutboxEvent);
export type OutboxEventDocument = HydratedDocument<OutboxEvent>;

@Schema({ collection: 'inbox_events', timestamps: false, versionKey: false })
export class InboxEvent {
  _id!: Types.ObjectId;
  @Prop({ type: String, required: true }) consumerName!: string;
  @Prop({ type: String, required: true }) eventId!: string;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: Date, required: true }) receivedAt!: Date;
  @Prop({ type: Date, default: null }) processedAt!: Date | null;
  @Prop({ type: String, enum: ['processing', 'processed', 'failed'], default: 'processing' })
  status!: string;
  @Prop({ type: String, required: true }) payloadHash!: string;
}
export const InboxEventSchema = SchemaFactory.createForClass(InboxEvent);

@Schema({ collection: 'event_processing_failures', timestamps: true, versionKey: false })
export class EventProcessingFailure {
  _id!: Types.ObjectId;
  createdAt!: Date;
  @Prop({ type: String, required: true }) consumerName!: string;
  @Prop({ type: String, required: true }) eventId!: string;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: String, required: true }) error!: string;
  @Prop({ type: Number, required: true }) attempt!: number;
  @Prop({ type: String, enum: ['retryable', 'quarantined'], required: true }) status!: string;
  @Prop({ type: Date, required: true }) nextAttemptAt!: Date;
  @Prop({ type: Date, default: null }) archivedAt!: Date | null;
}
export const EventProcessingFailureSchema = SchemaFactory.createForClass(EventProcessingFailure);

OutboxEventSchema.index({ status: 1, availableAt: 1 });
OutboxEventSchema.index({ workspaceId: 1, aggregateType: 1, aggregateId: 1, occurredAt: 1 });
OutboxEventSchema.index(
  { processedAt: 1 },
  { expireAfterSeconds: 30 * 86_400, partialFilterExpression: { status: 'processed' } },
);
InboxEventSchema.index({ consumerName: 1, eventId: 1 }, { unique: true });
InboxEventSchema.index(
  { processedAt: 1 },
  { expireAfterSeconds: 90 * 86_400, partialFilterExpression: { status: 'processed' } },
);
EventProcessingFailureSchema.index({ status: 1, nextAttemptAt: 1 });
EventProcessingFailureSchema.index({ archivedAt: 1 }, { expireAfterSeconds: 365 * 86_400 });
