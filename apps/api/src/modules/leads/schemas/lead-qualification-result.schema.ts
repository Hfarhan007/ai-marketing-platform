import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';

@Schema({ collection: 'lead_qualification_results', timestamps: true, versionKey: false })
export class LeadQualificationResult {
  _id!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) createdBy!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, default: null }) leadId!: Types.ObjectId | null;
  @Prop({ type: String, required: true, unique: true }) requestId!: string;
  @Prop({ type: String, required: true }) promptVersion!: string;
  @Prop({ type: String, required: true }) provider!: string;
  @Prop({ type: String, required: true }) model!: string;
  @Prop({ type: MongooseSchema.Types.Mixed, required: true }) result!: Record<string, unknown>;
  @Prop({ type: Number, required: true }) inputTokens!: number;
  @Prop({ type: Number, required: true }) outputTokens!: number;
  @Prop({ type: Number, required: true }) costUsd!: number;
  @Prop({ type: Boolean, default: true }) inputPiiRedacted!: boolean;
}
export const LeadQualificationResultSchema = SchemaFactory.createForClass(LeadQualificationResult);
LeadQualificationResultSchema.index({ workspaceId: 1, createdAt: -1 });
LeadQualificationResultSchema.index({ workspaceId: 1, leadId: 1, createdAt: -1 });
