import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import type { CrmEntity } from '../../crm/crm.types.js';
@Schema({ collection: 'booking_services', timestamps: true, versionKey: false })
export class BookingService implements CrmEntity {
  _id!: Types.ObjectId; createdAt!: Date; updatedAt!: Date;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) createdBy!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) updatedBy!: Types.ObjectId;
  @Prop({ type: Number, default: 0 }) version!: number;
  @Prop({ type: Date, default: null }) deletedAt!: Date | null;
  @Prop({ type: String, required: true }) name!: string;
  @Prop({ type: String, default: '' }) description!: string;
  @Prop({ type: Number, required: true, min: 5 }) durationMinutes!: number;
  @Prop({ type: Number, default: 0, min: 0 }) price!: number;
  @Prop({ type: String, default: 'USD' }) currency!: string;
  @Prop({ type: Number, default: 0 }) bufferBeforeMinutes!: number;
  @Prop({ type: Number, default: 0 }) bufferAfterMinutes!: number;
  @Prop({ type: Boolean, default: true }) active!: boolean;
}
export type BookingServiceDocument = HydratedDocument<BookingService>;
export const BookingServiceSchema = SchemaFactory.createForClass(BookingService);
BookingServiceSchema.index({ workspaceId: 1, active: 1, name: 1 });
