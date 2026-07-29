import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';
@Schema({ collection: 'data_transfer_jobs', timestamps: true, versionKey: false })
export class DataTransferJob {
  _id!: Types.ObjectId;
  createdAt!: Date;
  updatedAt!: Date;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) actorId!: Types.ObjectId;
  @Prop({ type: String, enum: ['import', 'export'], required: true }) kind!: string;
  @Prop({ type: String, required: true }) entity!: string;
  @Prop({ type: MongooseSchema.Types.ObjectId, default: null })
  sourceFileId!: Types.ObjectId | null;
  @Prop({ type: String, default: null }) sourceStorageKey!: string | null;
  @Prop({ type: String, enum: ['csv', 'xlsx', 'json'], required: true }) format!: string;
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} }) mapping!: Record<string, string>;
  @Prop({ type: String, enum: ['skip', 'update', 'merge', 'create_new'], default: 'skip' })
  duplicatePolicy!: string;
  @Prop({ type: Boolean, default: false }) dryRun!: boolean;
  @Prop({ type: Boolean, default: false }) encrypted!: boolean;
  @Prop({ type: [String], default: [] }) selectedFields!: string[];
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} }) filter!: Record<string, unknown>;
  @Prop({ type: String, required: true }) idempotencyKey!: string;
  @Prop({
    type: String,
    enum: ['draft', 'queued', 'running', 'completed', 'failed', 'cancelled'],
    default: 'draft',
  })
  status!: string;
  @Prop({ type: Boolean, default: false }) cancelRequested!: boolean;
  @Prop({ type: Number, default: 0 }) progress!: number;
  @Prop({ type: Number, default: 0 }) totalRows!: number;
  @Prop({ type: Number, default: 0 }) processedRows!: number;
  @Prop({ type: Number, default: 0 }) successRows!: number;
  @Prop({ type: Number, default: 0 }) skippedRows!: number;
  @Prop({ type: Number, default: 0 }) errorRows!: number;
  @Prop({ type: [String], default: [] }) headers!: string[];
  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] }) preview!: Record<string, unknown>[];
  @Prop({ type: String, default: null }) resultStorageKey!: string | null;
  @Prop({ type: String, default: null }) errorReportStorageKey!: string | null;
  @Prop({ type: Date, default: null }) expiresAt!: Date | null;
  @Prop({ type: String, default: null }) lastError!: string | null;
}
export const DataTransferJobSchema = SchemaFactory.createForClass(DataTransferJob);
DataTransferJobSchema.index({ workspaceId: 1, idempotencyKey: 1 }, { unique: true });
DataTransferJobSchema.index({ workspaceId: 1, createdAt: -1 });
DataTransferJobSchema.index({ workspaceId: 1, expiresAt: 1 });
// Export expiry is enforced by the lifecycle worker after legal-hold evaluation.
@Schema({ collection: 'data_transfer_row_receipts', timestamps: true, versionKey: false })
export class DataTransferRowReceipt {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) jobId!: Types.ObjectId;
  @Prop({ type: Number, required: true }) rowNumber!: number;
  @Prop({ type: String, required: true }) rowHash!: string;
  @Prop({ type: String, required: true }) status!: string;
}
export const DataTransferRowReceiptSchema = SchemaFactory.createForClass(DataTransferRowReceipt);
DataTransferRowReceiptSchema.index(
  { workspaceId: 1, jobId: 1, rowNumber: 1, rowHash: 1 },
  { unique: true },
);
@Schema({ collection: 'data_transfer_row_errors', timestamps: true, versionKey: false })
export class DataTransferRowError {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) jobId!: Types.ObjectId;
  @Prop({ type: Number, required: true }) rowNumber!: number;
  @Prop({ type: String, required: true }) code!: string;
  @Prop({ type: String, required: true }) message!: string;
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} }) row!: Record<string, unknown>;
}
export const DataTransferRowErrorSchema = SchemaFactory.createForClass(DataTransferRowError);
DataTransferRowErrorSchema.index({ workspaceId: 1, jobId: 1, rowNumber: 1 });
