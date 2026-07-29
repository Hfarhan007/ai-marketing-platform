import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';

@Schema({ collection: 'ai_memory_records', timestamps: true, versionKey: false })
export class AiMemoryRecord {
  _id!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) subjectId!: Types.ObjectId;
  @Prop({ type: String, required: true }) key!: string;
  @Prop({ type: MongooseSchema.Types.Mixed, required: true }) value!: unknown;
  @Prop({ type: String, required: true }) region!: string;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  consentPolicyVersionId!: Types.ObjectId;
}
export const AiMemoryRecordSchema = SchemaFactory.createForClass(AiMemoryRecord);
AiMemoryRecordSchema.index({ workspaceId: 1, subjectId: 1, key: 1 }, { unique: true });
