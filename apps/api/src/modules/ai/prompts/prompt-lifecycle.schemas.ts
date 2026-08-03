import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';
@Schema({ collection: 'ai_prompt_assignments', timestamps: true, versionKey: false })
export class PromptAssignment {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) templateId!: Types.ObjectId;
  @Prop({ type: String, required: true }) feature!: string;
  @Prop({ type: String, enum: ['development', 'staging', 'production'], required: true }) environment!: string;
  @Prop({ type: Number, required: true }) stableVersion!: number;
  @Prop({ type: Number, default: null }) canaryVersion!: number | null;
  @Prop({ type: Number, min: 0, max: 100, default: 100 }) rolloutPercentage!: number;
  @Prop({ type: [String], default: [] }) canaryWorkspaceIds!: string[];
  @Prop({ type: Number, default: null }) rollbackVersion!: number | null;
}
export const PromptAssignmentSchema = SchemaFactory.createForClass(PromptAssignment);
PromptAssignmentSchema.index({ workspaceId: 1, templateId: 1, feature: 1, environment: 1 }, { unique: true });
@Schema({ collection: 'ai_prompt_approval_audits', timestamps: true, versionKey: false })
export class PromptApprovalAudit {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) templateId!: Types.ObjectId;
  @Prop({ type: Number, required: true }) version!: number;
  @Prop({ type: String, required: true }) action!: string;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) actorId!: Types.ObjectId;
  @Prop({ type: String, required: true }) reason!: string;
  @Prop({ type: String, required: true }) fromStatus!: string;
  @Prop({ type: String, required: true }) toStatus!: string;
}
export const PromptApprovalAuditSchema = SchemaFactory.createForClass(PromptApprovalAudit);
PromptApprovalAuditSchema.index({ workspaceId: 1, templateId: 1, version: 1, createdAt: -1 });
