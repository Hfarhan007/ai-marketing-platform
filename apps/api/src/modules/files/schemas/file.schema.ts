import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
@Schema({ collection: 'files', timestamps: true, versionKey: false })
export class StoredFile {
  _id!: Types.ObjectId;
  createdAt!: Date;
  updatedAt!: Date;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: String, required: true }) originalName!: string;
  @Prop({ type: String, required: true }) storageKey!: string;
  @Prop({ type: String, required: true }) mimeType!: string;
  @Prop({ type: String, required: true }) extension!: string;
  @Prop({ type: Number, required: true }) size!: number;
  @Prop({ type: String, required: true }) checksum!: string;
  @Prop({ type: MongooseSchema.Types.Mixed, default: null }) dimensions!: {
    width: number;
    height: number;
  } | null;
  @Prop({ type: Number, default: null }) duration!: number | null;
  @Prop({ type: String, default: '' }) folder!: string;
  @Prop({ type: [String], default: [] }) tags!: string[];
  @Prop({
    type: String,
    enum: ['pending', 'active', 'quarantined', 'deleted', 'failed'],
    default: 'pending',
  })
  status!: string;
  @Prop({ type: String, enum: ['pending', 'clean', 'infected', 'failed'], default: 'pending' })
  scanStatus!: string;
  @Prop({
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'not_required'],
    default: 'pending',
  })
  processingStatus!: string;
  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] }) usageReferences!: Record<
    string,
    string
  >[];
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) createdBy!: Types.ObjectId;
  @Prop({ type: Date, default: null }) deletedAt!: Date | null;
  @Prop({ type: Date, required: true }) uploadExpiresAt!: Date;
  @Prop({ type: String, default: 'private' }) visibility!: string;
}
export type StoredFileDocument = HydratedDocument<StoredFile>;
export const StoredFileSchema = SchemaFactory.createForClass(StoredFile);
StoredFileSchema.index({ workspaceId: 1, checksum: 1, size: 1 });
StoredFileSchema.index({ workspaceId: 1, status: 1, createdAt: -1 });
StoredFileSchema.index({ workspaceId: 1, folder: 1, createdAt: -1 });
StoredFileSchema.index({ status: 1, uploadExpiresAt: 1 });
