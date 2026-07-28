import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import type { CrmEntity } from '../../crm/crm.types.js';
@Schema({ collection: 'tasks', timestamps: true, versionKey: false })
export class Task implements CrmEntity {
  _id!: Types.ObjectId; createdAt!: Date; updatedAt!: Date;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) createdBy!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) updatedBy!: Types.ObjectId;
  @Prop({ type: Number, default: 0 }) version!: number;
  @Prop({ type: Date, default: null }) deletedAt!: Date | null;
  @Prop({ type: String, required: true, maxlength: 300 }) title!: string;
  @Prop({ type: String, default: '' }) description!: string;
  @Prop({ type: String, enum: ['open', 'in_progress', 'completed', 'cancelled'], default: 'open' }) status!: string;
  @Prop({ type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' }) priority!: string;
  @Prop({ type: Date, default: null }) dueAt!: Date | null;
  @Prop({ type: String, default: 'UTC' }) timezone!: string;
  @Prop({ type: [Number], default: [] }) reminders!: number[];
  @Prop({ type: MongooseSchema.Types.ObjectId, default: null }) ownerId!: Types.ObjectId | null;
  @Prop({ type: MongooseSchema.Types.ObjectId, default: null }) contactId!: Types.ObjectId | null;
  @Prop({ type: MongooseSchema.Types.ObjectId, default: null }) companyId!: Types.ObjectId | null;
  @Prop({ type: MongooseSchema.Types.ObjectId, default: null }) dealId!: Types.ObjectId | null;
  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] }) checklist!: Record<string, string | boolean>[];
  @Prop({ type: MongooseSchema.Types.ObjectId, default: null }) parentTaskId!: Types.ObjectId | null;
  @Prop({ type: [MongooseSchema.Types.ObjectId], default: [] }) subtaskIds!: Types.ObjectId[];
  @Prop({ type: MongooseSchema.Types.Mixed, default: null }) recurrence!: Record<string, string | number> | null;
  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] }) completionHistory!: Record<string, Date | string>[];
}
export type TaskDocument = HydratedDocument<Task>;
export const TaskSchema = SchemaFactory.createForClass(Task);
TaskSchema.index({ workspaceId: 1, ownerId: 1, status: 1, dueAt: 1 });
TaskSchema.index({ workspaceId: 1, parentTaskId: 1 });
TaskSchema.index({ workspaceId: 1, title: 'text', description: 'text' });
