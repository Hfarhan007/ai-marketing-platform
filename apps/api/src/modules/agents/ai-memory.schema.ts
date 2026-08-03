import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';

export const MEMORY_TYPES = ['conversation_working', 'user_preference', 'workspace_knowledge', 'episodic_interaction', 'semantic', 'task_state'] as const;
export type MemoryType = (typeof MEMORY_TYPES)[number];
export const LONG_TERM_MEMORY_TYPES: readonly MemoryType[] = ['user_preference', 'workspace_knowledge', 'episodic_interaction', 'semantic'];

@Schema({ collection: 'ai_memory_records', timestamps: true, versionKey: false })
export class AiMemoryRecord {
  _id!: Types.ObjectId;
  createdAt!: Date;
  updatedAt!: Date;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: String, enum: ['user', 'contact', 'workspace', 'conversation', 'task'], required: true }) subjectType!: string;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) subjectId!: Types.ObjectId;
  @Prop({ type: String, enum: MEMORY_TYPES, required: true }) memoryType!: MemoryType;
  @Prop({ type: String, enum: ['short_term', 'long_term'], required: true }) storageTier!: string;
  @Prop({ type: MongooseSchema.Types.Mixed, required: true, select: false }) content!: unknown;
  @Prop({ type: String, required: true, select: false }) normalizedSummary!: string;
  @Prop({ type: [Number], default: null, select: false }) embedding!: number[] | null;
  @Prop({ type: MongooseSchema.Types.Mixed, required: true }) source!: { kind: string; id: string; occurredAt: Date };
  @Prop({ type: Number, min: 0, max: 1, required: true }) confidence!: number;
  @Prop({ type: String, enum: ['public', 'internal', 'confidential', 'restricted'], required: true }) sensitivity!: string;
  @Prop({ type: MongooseSchema.Types.Mixed, required: true }) consentBasis!: { policyVersionId: string | null; reason: string; evaluatedAt: Date };
  @Prop({ type: Date, required: true }) retentionExpiry!: Date;
  @Prop({ type: Date, required: true }) lastUsedAt!: Date;
  @Prop({ type: String, required: true }) factKey!: string;
  @Prop({ type: String, required: true }) contentHash!: string;
  @Prop({ type: Boolean, default: false }) verified!: boolean;
  @Prop({ type: String, enum: ['active', 'contradicted', 'superseded'], default: 'active' }) status!: string;
  @Prop({ type: [MongooseSchema.Types.ObjectId], default: [] }) contradicts!: Types.ObjectId[];
}
export const AiMemoryRecordSchema = SchemaFactory.createForClass(AiMemoryRecord);
AiMemoryRecordSchema.index({ workspaceId: 1, subjectType: 1, subjectId: 1, memoryType: 1, factKey: 1, status: 1 });
AiMemoryRecordSchema.index({ retentionExpiry: 1 }, { expireAfterSeconds: 0 });
AiMemoryRecordSchema.index({ workspaceId: 1, subjectId: 1, lastUsedAt: -1 });
