import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import type { CrmEntity } from '../../crm/crm.types.js';
@Schema({ collection: 'appointments', timestamps: true, versionKey: false })
export class Appointment implements CrmEntity {
  _id!: Types.ObjectId; createdAt!: Date; updatedAt!: Date;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) createdBy!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) updatedBy!: Types.ObjectId;
  @Prop({ type: Number, default: 0 }) version!: number;
  @Prop({ type: Date, default: null }) deletedAt!: Date | null;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) customerId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) staffId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) serviceId!: Types.ObjectId;
  @Prop({ type: Date, required: true }) startAt!: Date;
  @Prop({ type: Date, required: true }) endAt!: Date;
  @Prop({ type: String, required: true }) timezone!: string;
  @Prop({ type: String, enum: ['reserved', 'confirmed', 'completed', 'cancelled', 'no_show'], default: 'confirmed' }) status!: string;
  @Prop({ type: String, default: '' }) location!: string;
  @Prop({ type: String, default: '' }) meetingLink!: string;
  @Prop({ type: [Number], default: [] }) reminders!: number[];
  @Prop({ type: String, default: '' }) notes!: string;
  @Prop({ type: String, default: null }) cancellationReason!: string | null;
  @Prop({ type: Boolean, default: false }) noShow!: boolean;
  @Prop({ type: String, required: true }) idempotencyKey!: string;
  @Prop({ type: Number, default: 0 }) bufferBeforeMinutes!: number;
  @Prop({ type: Number, default: 0 }) bufferAfterMinutes!: number;
}
export type AppointmentDocument = HydratedDocument<Appointment>;
export const AppointmentSchema = SchemaFactory.createForClass(Appointment);
AppointmentSchema.index({ workspaceId: 1, staffId: 1, startAt: 1, endAt: 1, status: 1 });
AppointmentSchema.index({ workspaceId: 1, customerId: 1, startAt: -1 });
AppointmentSchema.index({ workspaceId: 1, idempotencyKey: 1 }, { unique: true });
