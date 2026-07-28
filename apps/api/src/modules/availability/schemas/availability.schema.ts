import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import type { CrmEntity } from '../../crm/crm.types.js';
@Schema({ collection: 'availability_rules', timestamps: true, versionKey: false })
export class Availability implements CrmEntity {
  _id!: Types.ObjectId; createdAt!: Date; updatedAt!: Date;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) createdBy!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) updatedBy!: Types.ObjectId;
  @Prop({ type: Number, default: 0 }) version!: number;
  @Prop({ type: Date, default: null }) deletedAt!: Date | null;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) staffId!: Types.ObjectId;
  @Prop({ type: String, required: true }) timezone!: string;
  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] }) workingHours!: Record<string, number | boolean>[];
  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] }) dateOverrides!: Record<string, string | number | boolean>[];
  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] }) breaks!: Record<string, number>[];
  @Prop({ type: [String], default: [] }) holidays!: string[];
  @Prop({ type: Number, default: 0 }) bufferBeforeMinutes!: number;
  @Prop({ type: Number, default: 0 }) bufferAfterMinutes!: number;
  @Prop({ type: Number, default: 0 }) minimumNoticeMinutes!: number;
  @Prop({ type: Number, default: 90 }) bookingHorizonDays!: number;
}
export type AvailabilityDocument = HydratedDocument<Availability>;
export const AvailabilitySchema = SchemaFactory.createForClass(Availability);
AvailabilitySchema.index({ workspaceId: 1, staffId: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });
