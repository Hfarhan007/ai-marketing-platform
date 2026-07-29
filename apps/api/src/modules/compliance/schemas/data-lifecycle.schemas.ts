import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';
import { DATA_CLASSES, LIFECYCLE_STATES } from '../data-lifecycle.types.js';

@Schema({ collection: 'data_lifecycle_policies', timestamps: true, versionKey: false })
export class DataLifecyclePolicy {
  _id!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: String, enum: DATA_CLASSES, required: true }) dataClass!: string;
  @Prop({ type: Number, required: true }) retentionDays!: number;
  @Prop({ type: Number, required: true }) recoveryDays!: number;
  @Prop({ type: String, enum: ['anonymize', 'hard_delete'], required: true }) deletionMode!: string;
  @Prop({ type: Boolean, default: true }) enabled!: boolean;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) updatedBy!: Types.ObjectId;
}
export const DataLifecyclePolicySchema = SchemaFactory.createForClass(DataLifecyclePolicy);
DataLifecyclePolicySchema.index({ workspaceId: 1, dataClass: 1 }, { unique: true });

@Schema({ collection: 'data_legal_holds', timestamps: true, versionKey: false })
export class DataLegalHold {
  _id!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: String, enum: DATA_CLASSES, required: true }) dataClass!: string;
  @Prop({ type: String, default: null }) recordId!: string | null;
  @Prop({ type: String, required: true }) reason!: string;
  @Prop({ type: Date, required: true }) effectiveAt!: Date;
  @Prop({ type: Date, default: null }) releasedAt!: Date | null;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) createdBy!: Types.ObjectId;
}
export const DataLegalHoldSchema = SchemaFactory.createForClass(DataLegalHold);
DataLegalHoldSchema.index({ workspaceId: 1, dataClass: 1, recordId: 1, releasedAt: 1 });

@Schema({ collection: 'data_deletion_manifests', timestamps: true, versionKey: false })
export class DataDeletionManifest {
  _id!: Types.ObjectId;
  createdAt!: Date;
  updatedAt!: Date;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: String, required: true }) idempotencyKey!: string;
  @Prop({ type: Boolean, required: true }) dryRun!: boolean;
  @Prop({
    type: String,
    enum: ['planned', 'running', 'completed', 'partial_failure', 'failed'],
    default: 'planned',
  })
  status!: string;
  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] })
  entries!: Array<Record<string, unknown>>;
  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] })
  history!: Array<Record<string, unknown>>;
  @Prop({ type: Number, default: 0 }) attempts!: number;
  @Prop({ type: String, default: null }) lastError!: string | null;
  @Prop({ type: Date, default: null }) completedAt!: Date | null;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) requestedBy!: Types.ObjectId;
}
export const DataDeletionManifestSchema = SchemaFactory.createForClass(DataDeletionManifest);
DataDeletionManifestSchema.index({ workspaceId: 1, idempotencyKey: 1 }, { unique: true });
DataDeletionManifestSchema.index({ status: 1, updatedAt: 1 });

@Schema({ collection: 'data_lifecycle_records', timestamps: true, versionKey: false })
export class DataLifecycleRecord {
  _id!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: String, enum: DATA_CLASSES, required: true }) dataClass!: string;
  @Prop({ type: String, required: true }) recordId!: string;
  @Prop({ type: String, enum: LIFECYCLE_STATES, required: true }) state!: string;
  @Prop({ type: Date, default: null }) scheduledDeletionAt!: Date | null;
  @Prop({ type: Date, default: null }) recoveryUntil!: Date | null;
  @Prop({ type: Date, default: null }) deletedAt!: Date | null;
}
export const DataLifecycleRecordSchema = SchemaFactory.createForClass(DataLifecycleRecord);
DataLifecycleRecordSchema.index({ workspaceId: 1, dataClass: 1, recordId: 1 }, { unique: true });
DataLifecycleRecordSchema.index({ state: 1, scheduledDeletionAt: 1 });
// Deliberately no TTL: every lifecycle record must be evaluated against legal holds.
