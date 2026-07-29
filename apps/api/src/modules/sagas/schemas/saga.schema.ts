import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';
import { SAGA_STATUSES, SAGA_TYPES } from '../saga.types.js';

@Schema({ collection: 'sagas', timestamps: true, versionKey: false })
export class Saga {
  _id!: Types.ObjectId;
  createdAt!: Date;
  updatedAt!: Date;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: String, enum: SAGA_TYPES, required: true }) type!: string;
  @Prop({ type: String, enum: SAGA_STATUSES, default: 'pending' }) status!: string;
  @Prop({ type: String, required: true }) correlationId!: string;
  @Prop({ type: String, default: null }) currentStep!: string | null;
  @Prop({ type: [String], default: [] }) completedSteps!: string[];
  @Prop({ type: [String], default: [] }) compensationSteps!: string[];
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  stepAttempts!: Record<string, number>;
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} }) payload!: Record<string, unknown>;
  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] })
  auditHistory!: Array<Record<string, unknown>>;
  @Prop({ type: Number, default: 0 }) version!: number;
  @Prop({ type: Date, required: true }) timeoutAt!: Date;
  @Prop({ type: Date, default: null }) nextAttemptAt!: Date | null;
  @Prop({ type: Date, default: null }) stepDeadlineAt!: Date | null;
  @Prop({ type: Date, default: null }) lastProgressAt!: Date | null;
  @Prop({ type: Date, default: null }) completedAt!: Date | null;
  @Prop({ type: Boolean, default: false }) cancellationRequested!: boolean;
  @Prop({ type: String, default: null }) lastError!: string | null;
  @Prop({ type: String, default: null }) manualInterventionReason!: string | null;
  @Prop({ type: String, default: null }) externalReference!: string | null;
  @Prop({ type: Boolean, default: false }) awaitingCompensation!: boolean;
}
export const SagaSchema = SchemaFactory.createForClass(Saga);
SagaSchema.index({ workspaceId: 1, correlationId: 1 }, { unique: true });
SagaSchema.index({ status: 1, nextAttemptAt: 1 });
SagaSchema.index({ status: 1, lastProgressAt: 1 });

@Schema({ collection: 'saga_alerts', timestamps: true, versionKey: false })
export class SagaAlert {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) sagaId!: Types.ObjectId;
  @Prop({ type: String, required: true }) kind!: string;
  @Prop({ type: String, required: true }) message!: string;
  @Prop({ type: Date, default: null }) acknowledgedAt!: Date | null;
}
export const SagaAlertSchema = SchemaFactory.createForClass(SagaAlert);
SagaAlertSchema.index({ sagaId: 1, kind: 1 }, { unique: true });
