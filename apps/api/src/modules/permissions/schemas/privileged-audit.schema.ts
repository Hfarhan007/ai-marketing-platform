import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';

@Schema({ collection: 'privileged_access_audit', timestamps: true, versionKey: false })
export class PrivilegedAccessAudit {
  _id!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  workspaceId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  userId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  membershipId!: Types.ObjectId;
  @Prop({ type: [String], required: true })
  requiredPermissions!: string[];
  @Prop({ type: Boolean, required: true })
  authorized!: boolean;
  @Prop({ type: String, required: true })
  operation!: string;
  createdAt!: Date;
}
export const PrivilegedAccessAuditSchema = SchemaFactory.createForClass(PrivilegedAccessAudit);
