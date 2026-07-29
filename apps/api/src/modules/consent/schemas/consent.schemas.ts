import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';
import { CONSENT_PURPOSES } from '../consent.types.js';

@Schema({ _id: false })
class WorkspaceSubject {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) subjectId!: Types.ObjectId;
}

@Schema({ collection: 'consent_purpose_definitions', timestamps: true, versionKey: false })
export class ConsentPurposeDefinition {
  _id!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: String, enum: CONSENT_PURPOSES, required: true }) key!: string;
  @Prop({ type: String, required: true }) name!: string;
  @Prop({ type: String, required: true }) description!: string;
  @Prop({ type: Boolean, default: true }) active!: boolean;
}
export const ConsentPurposeDefinitionSchema =
  SchemaFactory.createForClass(ConsentPurposeDefinition);
ConsentPurposeDefinitionSchema.index({ workspaceId: 1, key: 1 }, { unique: true });

@Schema({ collection: 'consent_policies', timestamps: true, versionKey: false })
export class ConsentPolicy {
  _id!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: String, required: true }) name!: string;
  @Prop({ type: String, default: 'GLOBAL' }) region!: string;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  activeVersionId!: Types.ObjectId;
}
export const ConsentPolicySchema = SchemaFactory.createForClass(ConsentPolicy);
ConsentPolicySchema.index({ workspaceId: 1, region: 1 }, { unique: true });

@Schema({ collection: 'consent_policy_versions', timestamps: true, versionKey: false })
export class ConsentPolicyVersion {
  _id!: Types.ObjectId;
  createdAt!: Date;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) policyId!: Types.ObjectId;
  @Prop({ type: Number, required: true }) version!: number;
  @Prop({ type: String, required: true }) region!: string;
  @Prop({ type: Date, required: true }) effectiveFrom!: Date;
  @Prop({ type: Date, default: null }) effectiveUntil!: Date | null;
  @Prop({ type: [MongooseSchema.Types.Mixed], required: true })
  purposeRules!: Array<{
    purpose: string;
    consentRequired: boolean;
    allowedLegalBases: string[];
    guardianConsentRequired?: boolean;
    restrictedExportFields?: string[];
  }>;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) createdBy!: Types.ObjectId;
}
export const ConsentPolicyVersionSchema = SchemaFactory.createForClass(ConsentPolicyVersion);
ConsentPolicyVersionSchema.index({ workspaceId: 1, policyId: 1, version: 1 }, { unique: true });

@Schema({ collection: 'consent_legal_bases', timestamps: true, versionKey: false })
export class ConsentLegalBasis {
  _id!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: String, required: true }) code!: string;
  @Prop({ type: String, enum: CONSENT_PURPOSES, required: true }) purpose!: string;
  @Prop({ type: String, required: true }) region!: string;
  @Prop({ type: String, required: true }) rationale!: string;
  @Prop({ type: Boolean, default: true }) active!: boolean;
  @Prop({ type: Date, required: true }) effectiveFrom!: Date;
  @Prop({ type: Date, default: null }) effectiveUntil!: Date | null;
}
export const ConsentLegalBasisSchema = SchemaFactory.createForClass(ConsentLegalBasis);

@Schema({ collection: 'consent_source_evidence', timestamps: true, versionKey: false })
export class ConsentSourceEvidence extends WorkspaceSubject {
  _id!: Types.ObjectId;
  @Prop({ type: String, required: true }) sourceType!: string;
  @Prop({ type: String, required: true }) sourceReference!: string;
  @Prop({ type: String, required: true }) evidenceHash!: string;
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} }) metadata!: Record<string, unknown>;
  @Prop({ type: Date, required: true }) capturedAt!: Date;
}
export const ConsentSourceEvidenceSchema = SchemaFactory.createForClass(ConsentSourceEvidence);

@Schema({
  collection: 'consent_receipts',
  timestamps: { createdAt: true, updatedAt: false },
  versionKey: false,
})
export class ConsentReceipt extends WorkspaceSubject {
  _id!: Types.ObjectId;
  createdAt!: Date;
  @Prop({ type: String, enum: CONSENT_PURPOSES, required: true }) purpose!: string;
  @Prop({ type: String, enum: ['granted', 'denied'], required: true }) decision!: string;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) policyVersionId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) evidenceId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, default: null })
  legalBasisId!: Types.ObjectId | null;
  @Prop({ type: Date, required: true }) recordedAt!: Date;
  @Prop({ type: Date, default: null }) expiresAt!: Date | null;
  @Prop({ type: MongooseSchema.Types.Mixed, default: null })
  guardian!: { subjectId?: string; name?: string; relationship?: string; verifiedAt?: Date } | null;
}
export const ConsentReceiptSchema = SchemaFactory.createForClass(ConsentReceipt);
ConsentReceiptSchema.index({ workspaceId: 1, subjectId: 1, purpose: 1, recordedAt: -1 });

@Schema({
  collection: 'consent_withdrawals',
  timestamps: { createdAt: true, updatedAt: false },
  versionKey: false,
})
export class ConsentWithdrawal extends WorkspaceSubject {
  _id!: Types.ObjectId;
  @Prop({ type: String, enum: CONSENT_PURPOSES, required: true }) purpose!: string;
  @Prop({ type: MongooseSchema.Types.ObjectId, default: null }) receiptId!: Types.ObjectId | null;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) policyVersionId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) evidenceId!: Types.ObjectId;
  @Prop({ type: Date, required: true }) withdrawnAt!: Date;
  @Prop({ type: String, default: null }) reason!: string | null;
}
export const ConsentWithdrawalSchema = SchemaFactory.createForClass(ConsentWithdrawal);
ConsentWithdrawalSchema.index({ workspaceId: 1, subjectId: 1, purpose: 1, withdrawnAt: -1 });

@Schema({
  collection: 'consent_audit_events',
  timestamps: { createdAt: true, updatedAt: false },
  versionKey: false,
})
export class ConsentAuditEvent extends WorkspaceSubject {
  @Prop({ type: String, required: true }) action!: string;
  @Prop({ type: String, required: true }) purpose!: string;
  @Prop({ type: Boolean, default: null }) allowed!: boolean | null;
  @Prop({ type: String, required: true }) reason!: string;
  @Prop({ type: MongooseSchema.Types.ObjectId, default: null })
  policyVersionId!: Types.ObjectId | null;
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} }) metadata!: Record<string, unknown>;
}
export const ConsentAuditEventSchema = SchemaFactory.createForClass(ConsentAuditEvent);

const immutable = (schema: MongooseSchema): void => {
  schema.pre('save', function () {
    if (!this.isNew) throw new Error('Consent history is immutable');
  });
  schema.pre(/^(update|findOneAndUpdate|replaceOne|delete)/, function () {
    throw new Error('Consent history is immutable');
  });
};
for (const schema of [
  ConsentPolicyVersionSchema,
  ConsentReceiptSchema,
  ConsentWithdrawalSchema,
  ConsentSourceEvidenceSchema,
  ConsentAuditEventSchema,
]) {
  immutable(schema);
}
