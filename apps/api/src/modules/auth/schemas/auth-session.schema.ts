import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types, type HydratedDocument } from 'mongoose';

@Schema({ collection: 'auth_sessions', timestamps: true, versionKey: false })
export class AuthSession {
  _id!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  userId!: Types.ObjectId;
  @Prop({ type: String, required: true })
  tokenFamilyId!: string;
  @Prop({ type: String, required: true })
  ipHash!: string;
  @Prop({ type: String, required: true })
  userAgentHash!: string;
  @Prop({ type: Date, required: true })
  expiresAt!: Date;
  @Prop({ type: Date, required: true })
  lastSeenAt!: Date;
  @Prop({ type: Date })
  revokedAt?: Date;
  @Prop({ type: String })
  revokeReason?: string;
  @Prop({ type: Boolean, required: true, default: false })
  suspicious!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}
export type AuthSessionDocument = HydratedDocument<AuthSession>;
export const AuthSessionSchema = SchemaFactory.createForClass(AuthSession);
