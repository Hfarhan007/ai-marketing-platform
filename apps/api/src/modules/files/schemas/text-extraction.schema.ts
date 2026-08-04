import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';
@Schema({ collection: 'file_text_extractions', timestamps: true, versionKey: false })
export class FileTextExtraction {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) fileId!: Types.ObjectId;
  @Prop({ type: String, required: true }) sourceChecksum!: string;
  @Prop({ type: String, required: true }) toolVersion!: string;
  @Prop({ type: String, required: true }) contentHash!: string;
  @Prop({ type: String, required: true, select: false }) text!: string;
  @Prop({ type: [MongooseSchema.Types.Mixed], default: [], select: false }) blocks!: Record<string, unknown>[];
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} }) metadata!: Record<string, unknown>;
  @Prop({ type: String, required: true }) language!: string;
  @Prop({ type: String, enum: ['high', 'medium', 'low'], required: true }) quality!: string;
  @Prop({ type: [String], default: [] }) warnings!: string[];
  @Prop({ type: String, enum: ['completed', 'failed'], required: true }) status!: string;
}
export const FileTextExtractionSchema = SchemaFactory.createForClass(FileTextExtraction);
FileTextExtractionSchema.index({ workspaceId: 1, fileId: 1, sourceChecksum: 1, toolVersion: 1 }, { unique: true });
