import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types, type HydratedDocument } from 'mongoose';

export const ACTIVITY_TYPES = [
  'contact_created',
  'note_added',
  'field_changed',
  'owner_changed',
  'task_created',
  'task_completed',
  'message_sent',
  'message_received',
  'email_opened',
  'campaign_interaction',
  'deal_moved',
  'deal_won',
  'deal_lost',
  'appointment_booked',
  'workflow_executed',
  'consent_changed',
  'file_attached',
  'ai_summary_generated',
] as const;

@Schema({ collection: 'activities', timestamps: false, versionKey: false })
export class Activity {
  _id!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: String, required: true }) sourceEventId!: string;
  @Prop({ type: String, enum: ACTIVITY_TYPES, required: true }) type!: string;
  @Prop({ type: String, required: true }) sourceDomain!: string;
  @Prop({ type: String, required: true }) aggregateType!: string;
  @Prop({ type: String, required: true }) aggregateId!: string;
  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] }) relatedEntities!: {
    type: string;
    id: string;
  }[];
  @Prop({ type: MongooseSchema.Types.ObjectId, default: null }) actorId!: Types.ObjectId | null;
  @Prop({ type: MongooseSchema.Types.Mixed, default: null }) actorSnapshot!: {
    displayName?: string;
    kind: string;
  } | null;
  @Prop({ type: String, required: true }) correlationId!: string;
  @Prop({ type: String, default: null }) causationId!: string | null;
  @Prop({ type: String, enum: ['workspace', 'restricted', 'internal'], default: 'workspace' })
  visibility!: string;
  @Prop({ type: [String], default: [] }) requiredPermissions!: string[];
  @Prop({ type: Boolean, default: false }) internalOnly!: boolean;
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} }) data!: Record<string, unknown>;
  @Prop({ type: Date, required: true }) occurredAt!: Date;
  @Prop({ type: Date, required: true }) processedAt!: Date;
  @Prop({ type: Date, required: true }) retainUntil!: Date;
}
export type ActivityDocument = HydratedDocument<Activity>;
export const ActivitySchema = SchemaFactory.createForClass(Activity);
ActivitySchema.index({ workspaceId: 1, sourceEventId: 1 }, { unique: true });
ActivitySchema.index({ workspaceId: 1, occurredAt: -1, _id: -1 });
ActivitySchema.index({ workspaceId: 1, aggregateType: 1, aggregateId: 1, occurredAt: -1, _id: -1 });
ActivitySchema.index({ retainUntil: 1 }, { expireAfterSeconds: 0 });
ActivitySchema.pre(
  /^(?:updateOne|updateMany|findOneAndUpdate|deleteOne|deleteMany)$/u,
  function immutableActivity() {
    throw new Error('ACTIVITY_RECORDS_ARE_IMMUTABLE');
  },
);
