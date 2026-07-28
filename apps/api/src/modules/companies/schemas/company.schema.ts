import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import type { CrmEntity } from '../../crm/crm.types.js';

@Schema({ collection: 'companies', timestamps: true, versionKey: false })
export class Company implements CrmEntity {
  _id!: Types.ObjectId;
  createdAt!: Date;
  updatedAt!: Date;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) createdBy!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) updatedBy!: Types.ObjectId;
  @Prop({ type: Number, default: 0 }) version!: number;
  @Prop({ type: Date, default: null }) deletedAt!: Date | null;
  @Prop({ type: String, required: true, trim: true, maxlength: 200 }) name!: string;
  @Prop({ type: String, default: '', lowercase: true, trim: true }) domain!: string;
  @Prop({ type: String, default: '' }) industry!: string;
  @Prop({ type: String, default: '' }) size!: string;
  @Prop({ type: String, default: '' }) revenueRange!: string;
  @Prop({ type: MongooseSchema.Types.ObjectId, default: null }) ownerId!: Types.ObjectId | null;
  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] }) addresses!: Record<string, string>[];
  @Prop({ type: [MongooseSchema.Types.ObjectId], default: [] }) contactIds!: Types.ObjectId[];
  @Prop({ type: [MongooseSchema.Types.ObjectId], default: [] }) dealIds!: Types.ObjectId[];
  @Prop({ type: [String], default: [] }) tags!: string[];
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} }) customFields!: Record<string, unknown>;
  @Prop({ type: MongooseSchema.Types.ObjectId, default: null })
  parentCompanyId!: Types.ObjectId | null;
  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] }) contactRoles!: {
    contactId: Types.ObjectId;
    role: string;
  }[];
}
export type CompanyDocument = HydratedDocument<Company>;
export const CompanySchema = SchemaFactory.createForClass(Company);
CompanySchema.index(
  { workspaceId: 1, domain: 1 },
  {
    unique: true,
    partialFilterExpression: { domain: { $type: 'string', $gt: '' }, deletedAt: null },
  },
);
CompanySchema.index({ workspaceId: 1, ownerId: 1, createdAt: -1 });
CompanySchema.index({
  workspaceId: 1,
  name: 'text',
  domain: 'text',
  industry: 'text',
  tags: 'text',
});
