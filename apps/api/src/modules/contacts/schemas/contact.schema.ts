import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import type { CrmEntity } from '../../crm/crm.types.js';

const StringList = { type: [String], default: [] } as const;
@Schema({ _id: false })
export class ContactPoint {
  @Prop({ type: String, required: true }) value!: string;
  @Prop({ type: String, required: true }) normalized!: string;
  @Prop({ type: String, default: 'other' }) label!: string;
  @Prop({ type: Boolean, default: false }) primary!: boolean;
}
const ContactPointSchema = SchemaFactory.createForClass(ContactPoint);

@Schema({ collection: 'contacts', timestamps: true, versionKey: false })
export class Contact implements CrmEntity {
  _id!: Types.ObjectId;
  createdAt!: Date;
  updatedAt!: Date;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) createdBy!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) updatedBy!: Types.ObjectId;
  @Prop({ type: Number, default: 0 }) version!: number;
  @Prop({ type: Date, default: null }) deletedAt!: Date | null;
  @Prop({ type: String, trim: true, maxlength: 100, default: '' }) firstName!: string;
  @Prop({ type: String, trim: true, maxlength: 100, default: '' }) lastName!: string;
  @Prop({ type: String, trim: true, maxlength: 200, required: true }) displayName!: string;
  @Prop({ type: [ContactPointSchema], default: [] }) emailAddresses!: ContactPoint[];
  @Prop({ type: [ContactPointSchema], default: [] }) phoneNumbers!: ContactPoint[];
  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] }) addresses!: Record<string, string>[];
  @Prop(StringList) tags!: string[];
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} }) customFields!: Record<string, unknown>;
  @Prop({ type: String, default: 'manual' }) source!: string;
  @Prop({ type: MongooseSchema.Types.ObjectId, default: null }) ownerId!: Types.ObjectId | null;
  @Prop({ type: [MongooseSchema.Types.ObjectId], default: [] }) companyIds!: Types.ObjectId[];
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} }) communicationPreferences!: Record<string, boolean>;
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} }) consentSummary!: Record<string, string | boolean>;
  @Prop({ type: String, default: 'subscriber' }) lifecycleStatus!: string;
  @Prop({ type: MongooseSchema.Types.ObjectId, default: null }) mergedIntoId!: Types.ObjectId | null;
}
export type ContactDocument = HydratedDocument<Contact>;
export const ContactSchema = SchemaFactory.createForClass(Contact);
ContactSchema.index({ workspaceId: 1, 'emailAddresses.normalized': 1 });
ContactSchema.index({ workspaceId: 1, 'phoneNumbers.normalized': 1 });
ContactSchema.index({ workspaceId: 1, ownerId: 1, createdAt: -1 });
ContactSchema.index({ workspaceId: 1, displayName: 'text', 'emailAddresses.value': 'text', tags: 'text' });
