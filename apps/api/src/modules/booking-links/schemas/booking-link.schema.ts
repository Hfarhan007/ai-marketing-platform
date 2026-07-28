import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import type { CrmEntity } from '../../crm/crm.types.js';
@Schema({ collection: 'booking_links', timestamps: true, versionKey: false })
export class BookingLink implements CrmEntity {
  _id!: Types.ObjectId; createdAt!: Date; updatedAt!: Date;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) createdBy!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) updatedBy!: Types.ObjectId;
  @Prop({ type: Number, default: 0 }) version!: number;
  @Prop({ type: Date, default: null }) deletedAt!: Date | null;
  @Prop({ type: String, required: true, lowercase: true }) slug!: string;
  @Prop({ type: [MongooseSchema.Types.ObjectId], default: [] }) serviceIds!: Types.ObjectId[];
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} }) staffRules!: Record<string, unknown>;
  @Prop({ type: MongooseSchema.Types.ObjectId, default: null }) availabilityId!: Types.ObjectId | null;
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} }) branding!: Record<string, string>;
  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] }) customQuestions!: Record<string, string | boolean>[];
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} }) confirmationSettings!: Record<string, string | boolean>;
  @Prop({ type: Boolean, default: true }) active!: boolean;
}
export type BookingLinkDocument = HydratedDocument<BookingLink>;
export const BookingLinkSchema = SchemaFactory.createForClass(BookingLink);
BookingLinkSchema.index({ slug: 1 }, { unique: true });
BookingLinkSchema.index({ workspaceId: 1, active: 1 });
