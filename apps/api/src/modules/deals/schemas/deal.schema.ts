import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import type { CrmEntity } from '../../crm/crm.types.js';

@Schema({ collection: 'deals', timestamps: true, versionKey: false })
export class Deal implements CrmEntity {
  _id!: Types.ObjectId;
  createdAt!: Date;
  updatedAt!: Date;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) createdBy!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) updatedBy!: Types.ObjectId;
  @Prop({ type: Number, default: 0 }) version!: number;
  @Prop({ type: Date, default: null }) deletedAt!: Date | null;
  @Prop({ type: String, required: true }) title!: string;
  @Prop({ type: Number, min: 0, required: true }) value!: number;
  @Prop({ type: String, required: true, minlength: 3, maxlength: 3, uppercase: true })
  currency!: string;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) pipelineId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) stageId!: Types.ObjectId;
  @Prop({ type: Number, min: 0, max: 100, default: 0 }) probability!: number;
  @Prop({ type: String, default: 'open' }) status!: string;
  @Prop({ type: MongooseSchema.Types.ObjectId, default: null }) ownerId!: Types.ObjectId | null;
  @Prop({ type: MongooseSchema.Types.ObjectId, default: null }) contactId!: Types.ObjectId | null;
  @Prop({ type: MongooseSchema.Types.ObjectId, default: null }) companyId!: Types.ObjectId | null;
  @Prop({ type: Date, default: null }) expectedCloseDate!: Date | null;
  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] }) lineItems!: Record<
    string,
    string | number
  >[];
  @Prop({ type: String, default: null }) wonReason!: string | null;
  @Prop({ type: String, default: null }) lostReason!: string | null;
  @Prop({ type: Date, default: Date.now }) stageEnteredAt!: Date;
  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] }) stageHistory!: {
    stageId: Types.ObjectId;
    enteredAt: Date;
    exitedAt: Date;
    durationMs: number;
  }[];
  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] }) valueHistory!: {
    from: number;
    to: number;
    changedAt: Date;
    changedBy: Types.ObjectId;
  }[];
  @Prop({ type: String, enum: ['pipeline', 'best_case', 'commit', 'closed'], default: 'pipeline' })
  forecastCategory!: string;
  @Prop({
    type: String,
    enum: ['not_required', 'pending', 'approved', 'rejected'],
    default: 'not_required',
  })
  approvalStatus!: string;
  @Prop({ type: Date, default: null }) closedAt!: Date | null;
  @Prop({ type: Number, default: 0 }) attributedRevenue!: number;
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} }) customFields!: Record<string, unknown>;
}
export type DealDocument = HydratedDocument<Deal>;
export const DealSchema = SchemaFactory.createForClass(Deal);
DealSchema.index({ workspaceId: 1, pipelineId: 1, stageId: 1, status: 1 });
DealSchema.index({ workspaceId: 1, ownerId: 1, expectedCloseDate: 1 });
DealSchema.index({ workspaceId: 1, title: 'text' });
