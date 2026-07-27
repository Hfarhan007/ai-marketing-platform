import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';

abstract class ExpiringUserToken {
  _id!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  userId!: Types.ObjectId;
  @Prop({ type: String, required: true, select: false })
  tokenHash!: string;
  @Prop({ type: Date, required: true })
  expiresAt!: Date;
  @Prop({ type: Date })
  usedAt?: Date;
}

@Schema({ collection: 'email_verification_tokens', timestamps: true, versionKey: false })
export class EmailVerificationToken extends ExpiringUserToken {}
export const EmailVerificationTokenSchema = SchemaFactory.createForClass(EmailVerificationToken);

@Schema({ collection: 'password_reset_tokens', timestamps: true, versionKey: false })
export class PasswordResetToken extends ExpiringUserToken {}
export const PasswordResetTokenSchema = SchemaFactory.createForClass(PasswordResetToken);
