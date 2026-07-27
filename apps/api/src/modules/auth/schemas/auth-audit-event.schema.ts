import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';

@Schema({ collection: 'auth_audit_events', timestamps: true, versionKey: false })
export class AuthAuditEventRecord {
  _id!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId })
  userId?: Types.ObjectId;
  @Prop({ type: String, required: true })
  action!: string;
  @Prop({ type: Boolean, required: true })
  successful!: boolean;
  @Prop({ type: String, required: true })
  ipHash!: string;
  @Prop({ type: String })
  metadataCode?: string;
  createdAt!: Date;
}
export const AuthAuditEventSchema = SchemaFactory.createForClass(AuthAuditEventRecord);
