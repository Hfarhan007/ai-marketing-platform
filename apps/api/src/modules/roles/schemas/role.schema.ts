import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types, type HydratedDocument } from 'mongoose';
import { ALLOWED_ADMIN_WILDCARDS, PERMISSIONS } from '../../permissions/constants/permission.catalog.js';

export enum RoleScope {
  System = 'system',
  Workspace = 'workspace',
}

export enum RoleStatus {
  Active = 'active',
  Revoked = 'revoked',
}

@Schema({ collection: 'roles', timestamps: true, versionKey: 'version', optimisticConcurrency: true })
export class Role {
  _id!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId })
  workspaceId?: Types.ObjectId;
  @Prop({ type: String, enum: RoleScope, required: true })
  scope!: RoleScope;
  @Prop({ type: String, required: true, trim: true, maxlength: 80 })
  name!: string;
  @Prop({ type: String, required: true, trim: true, maxlength: 80 })
  key!: string;
  @Prop({ type: [String], enum: [...PERMISSIONS, ...ALLOWED_ADMIN_WILDCARDS], default: () => [] })
  permissions!: string[];
  @Prop({ type: [String], default: () => [] })
  permissionGroups!: string[];
  @Prop({ type: String, enum: RoleStatus, required: true, default: RoleStatus.Active })
  status!: RoleStatus;
  @Prop({ type: Boolean, required: true, default: false })
  immutable!: boolean;
  @Prop({ type: Date })
  revokedAt?: Date;
  createdAt!: Date;
  updatedAt!: Date;
  version!: number;
}

export type RoleDocument = HydratedDocument<Role>;
export const RoleSchema = SchemaFactory.createForClass(Role);
