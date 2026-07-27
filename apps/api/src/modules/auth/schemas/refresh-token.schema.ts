import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types, type HydratedDocument } from 'mongoose';

@Schema({ collection: 'refresh_tokens', timestamps: true, versionKey: false })
export class RefreshTokenRecord {
  _id!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  userId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  sessionId!: Types.ObjectId;
  @Prop({ type: String, required: true })
  familyId!: string;
  @Prop({ type: String, required: true, select: false })
  tokenHash!: string;
  @Prop({ type: String })
  parentTokenHash?: string;
  @Prop({ type: Date, required: true })
  expiresAt!: Date;
  @Prop({ type: Date })
  usedAt?: Date;
  @Prop({ type: Date })
  revokedAt?: Date;
  createdAt!: Date;
  updatedAt!: Date;
}
export type RefreshTokenDocument = HydratedDocument<RefreshTokenRecord>;
export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshTokenRecord);
