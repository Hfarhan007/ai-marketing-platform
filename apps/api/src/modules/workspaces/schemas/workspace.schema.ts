import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types, type HydratedDocument } from 'mongoose';

export enum WorkspaceStatus {
  Active = 'active',
  Suspended = 'suspended',
  Archived = 'archived',
}

@Schema({ _id: false })
export class WorkspaceBranding {
  @Prop({ type: String })
  logoUrl?: string;
  @Prop({ type: String })
  primaryColor?: string;
  @Prop({ type: String })
  accentColor?: string;
}

@Schema({ _id: false })
export class WorkspaceDomainSettings {
  @Prop({ type: String })
  customDomain?: string;
  @Prop({ type: Boolean, default: false })
  verified!: boolean;
}

@Schema({ _id: false })
export class WorkspaceUsageLimits {
  @Prop({ type: Number, required: true, default: 5, min: 1 })
  seats!: number;
  @Prop({ type: Number, required: true, default: 10_000, min: 0 })
  contacts!: number;
  @Prop({ type: Number, required: true, default: 1_000, min: 0 })
  monthlyAiCredits!: number;
  @Prop({ type: Number, required: true, default: 5_368_709_120, min: 0 })
  storageBytes!: number;
}

const WorkspaceBrandingSchema = SchemaFactory.createForClass(WorkspaceBranding);
const WorkspaceDomainSettingsSchema = SchemaFactory.createForClass(WorkspaceDomainSettings);
const WorkspaceUsageLimitsSchema = SchemaFactory.createForClass(WorkspaceUsageLimits);

@Schema({ collection: 'workspaces', timestamps: true, versionKey: 'version', optimisticConcurrency: true })
export class Workspace {
  _id!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, maxlength: 120 })
  name!: string;
  @Prop({ type: String, required: true, lowercase: true, trim: true, maxlength: 80 })
  slug!: string;
  @Prop({ type: String, enum: WorkspaceStatus, required: true, default: WorkspaceStatus.Active })
  status!: WorkspaceStatus;
  @Prop({ type: String, required: true, default: 'UTC' })
  timezone!: string;
  @Prop({ type: String, required: true, default: 'en-US' })
  locale!: string;
  @Prop({ type: String, required: true, default: 'USD', minlength: 3, maxlength: 3 })
  currency!: string;
  @Prop({ type: String, required: true, default: 'free' })
  plan!: string;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  ownerId!: Types.ObjectId;
  @Prop({ type: WorkspaceBrandingSchema, default: () => ({}) })
  branding!: WorkspaceBranding;
  @Prop({ type: WorkspaceDomainSettingsSchema, default: () => ({ verified: false }) })
  domainSettings!: WorkspaceDomainSettings;
  @Prop({ type: Map, of: Boolean, default: () => ({}) })
  featureFlags!: Map<string, boolean>;
  @Prop({ type: WorkspaceUsageLimitsSchema, default: () => ({}) })
  usageLimits!: WorkspaceUsageLimits;
  createdAt!: Date;
  updatedAt!: Date;
  version!: number;
}

export type WorkspaceDocument = HydratedDocument<Workspace>;
export const WorkspaceSchema = SchemaFactory.createForClass(Workspace);
