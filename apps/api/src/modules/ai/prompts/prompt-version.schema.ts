import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';
@Schema({ collection: 'ai_prompt_versions', timestamps: true, versionKey: false })
export class PromptVersion {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) templateId!: Types.ObjectId;
  @Prop({ type: Number, required: true }) version!: number;
  @Prop({ type: String, required: true, select: false }) content!: string;
  @Prop({ type: String, required: true }) contentHash!: string;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) createdBy!: Types.ObjectId;
}
export const PromptVersionSchema = SchemaFactory.createForClass(PromptVersion);
PromptVersionSchema.index({ workspaceId: 1, templateId: 1, version: 1 }, { unique: true });
