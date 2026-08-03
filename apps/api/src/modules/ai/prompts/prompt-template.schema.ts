import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';
@Schema({ collection: 'ai_prompt_templates', timestamps: true, versionKey: false })
export class PromptTemplate {
  _id!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: String, required: true }) key!: string;
  @Prop({ type: String, required: true }) name!: string;
  @Prop({ type: String, default: '' }) description!: string;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) createdBy!: Types.ObjectId;
  @Prop({ type: Number, default: 1 }) activeVersion!: number;
  @Prop({ type: Boolean, default: true }) enabled!: boolean;
}
export const PromptTemplateSchema = SchemaFactory.createForClass(PromptTemplate);
PromptTemplateSchema.index({ workspaceId: 1, key: 1 }, { unique: true });
