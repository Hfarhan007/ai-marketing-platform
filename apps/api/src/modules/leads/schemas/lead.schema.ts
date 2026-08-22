import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import type { CrmEntity } from '../../crm/crm.types.js';

@Schema({ collection: 'leads', timestamps: true, versionKey: false })
export class Lead implements CrmEntity {
  _id!: Types.ObjectId;
  createdAt!: Date;
  updatedAt!: Date;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) createdBy!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) updatedBy!: Types.ObjectId;
  @Prop({ type: Number, default: 0 }) version!: number;
  @Prop({ type: Date, default: null }) deletedAt!: Date | null;
  @Prop({ type: String, required: true }) name!: string;
  @Prop({ type: String, default: '' }) email!: string;
  @Prop({ type: String, default: '' }) phone!: string;
  @Prop({ type: String, default: 'manual' }) source!: string;
  @Prop({ type: MongooseSchema.Types.ObjectId, default: null }) campaignId!: Types.ObjectId | null;
  @Prop({ type: Number, min: 0, max: 100, default: 0 }) score!: number;
  @Prop({ type: String, default: 'unqualified' }) qualification!: string;
  @Prop({ type: String, default: 'new' }) status!: string;
  @Prop({ type: MongooseSchema.Types.ObjectId, default: null }) ownerId!: Types.ObjectId | null;
  @Prop({ type: Date, default: null }) followUpAt!: Date | null;
  @Prop({ type: MongooseSchema.Types.Mixed, default: null }) conversion!: Record<
    string,
    string
  > | null;
  @Prop({ type: String, default: null }) disqualificationReason!: string | null;
  @Prop({ type: [MongooseSchema.Types.ObjectId], default: [] })
  aiSummaryReferenceIds!: Types.ObjectId[];
  @Prop({ type: [String], default: [] }) tags!: string[];
  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] }) scoreHistory!: {
    from: number;
    to: number;
    changedAt: Date;
    changedBy: Types.ObjectId;
  }[];
  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] }) qualificationAuditTrail!: {
    from: string;
    to: string;
    reason?: string;
    changedAt: Date;
    changedBy: Types.ObjectId;
  }[];
  @Prop({ type: String, default: '' }) normalizedEmail!: string;
  @Prop({ type: String, default: '' }) normalizedPhone!: string;
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} }) customFields!: Record<string, unknown>;
  @Prop({ type: String, default: null }) externalProvider!: string | null;
  @Prop({ type: String, default: null }) externalLeadId!: string | null;
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} }) providerMetadata!: Record<string, unknown>;
  @Prop({ type: MongooseSchema.Types.Mixed, default: null, select: false }) rawProviderPayload!: Record<string, unknown> | null;
  @Prop({ type: Date, default: null }) externallyReceivedAt!: Date | null;
}
export type LeadDocument = HydratedDocument<Lead>;
export const LeadSchema = SchemaFactory.createForClass(Lead);
LeadSchema.index({ workspaceId: 1, status: 1, createdAt: -1 });
LeadSchema.index({ workspaceId: 1, ownerId: 1, followUpAt: 1 });
LeadSchema.index({ workspaceId: 1, name: 'text', email: 'text', phone: 'text' });
LeadSchema.index({ workspaceId: 1, normalizedEmail: 1, status: 1 });
LeadSchema.index({ workspaceId: 1, normalizedPhone: 1, status: 1 });
LeadSchema.index(
  { workspaceId: 1, externalProvider: 1, externalLeadId: 1 },
  { unique: true, partialFilterExpression: { externalProvider: { $type: 'string' }, externalLeadId: { $type: 'string' } } },
);
