import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';
@Schema({ collection: 'ai_prompt_versions', timestamps: true, versionKey: false })
export class PromptVersion {
  _id!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) templateId!: Types.ObjectId;
  @Prop({ type: Number, required: true }) version!: number;
  @Prop({ type: String, required: true, select: false }) content!: string;
  @Prop({ type: String, required: true }) contentHash!: string;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) createdBy!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.Mixed, default: [] }) variables!: Array<{ name: string; type: 'string' | 'number' | 'boolean'; required: boolean; maxLength?: number }>;
  @Prop({ type: MongooseSchema.Types.Mixed, default: null }) outputSchema!: Record<string, unknown> | null;
  @Prop({ type: [String], default: [] }) composedPrompts!: string[];
  @Prop({ type: [String], default: [] }) features!: string[];
  @Prop({ type: [String], default: ['development'] }) environments!: string[];
  @Prop({ type: String, enum: ['draft', 'review', 'approved', 'active', 'retired'], default: 'draft' }) status!: string;
  @Prop({ type: String, enum: ['pending', 'passed', 'failed'], default: 'pending' }) evaluationStatus!: string;
  @Prop({ type: String, required: true }) changelog!: string;
  @Prop({ type: MongooseSchema.Types.ObjectId, default: null }) approvedBy!: Types.ObjectId | null;
  @Prop({ type: Date, default: null }) approvedAt!: Date | null;
}
export const PromptVersionSchema = SchemaFactory.createForClass(PromptVersion);
PromptVersionSchema.index({ workspaceId: 1, templateId: 1, version: 1 }, { unique: true });
const immutable = new Set(['content', 'contentHash', 'variables', 'outputSchema', 'composedPrompts', 'features', 'environments', 'changelog', 'version', 'templateId']);
for (const operation of ['updateOne', 'updateMany', 'findOneAndUpdate'] as const)
  PromptVersionSchema.pre(operation, function () {
    const update = this.getUpdate() as Record<string, unknown> | null;
    const changed = new Set([...Object.keys(update ?? {}), ...Object.keys((update?.$set as Record<string, unknown>) ?? {})]);
    if ([...changed].some((key) => immutable.has(key))) throw new Error('Prompt version content is immutable');
  });
