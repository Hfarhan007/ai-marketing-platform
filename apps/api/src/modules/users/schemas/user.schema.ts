import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, type HydratedDocument } from 'mongoose';

export enum UserStatus {
  PendingVerification = 'pending_verification',
  Active = 'active',
  Locked = 'locked',
  Disabled = 'disabled',
}

@Schema({ collection: 'users', timestamps: true, versionKey: 'version', optimisticConcurrency: true })
export class User {
  _id!: Types.ObjectId;
  @Prop({ type: String, required: true, lowercase: true, trim: true, maxlength: 320 })
  email!: string;
  @Prop({ type: String, required: true, select: false })
  passwordHash!: string;
  @Prop({ type: String, required: true, trim: true, maxlength: 120 })
  displayName!: string;
  @Prop({ type: String, enum: UserStatus, required: true, default: UserStatus.PendingVerification })
  status!: UserStatus;
  @Prop({ type: Date })
  emailVerifiedAt?: Date;
  @Prop({ type: Number, required: true, default: 0, min: 0 })
  failedLoginCount!: number;
  @Prop({ type: Date })
  lockedUntil?: Date;
  @Prop({ type: Date, required: true })
  passwordChangedAt!: Date;
  @Prop({ type: Boolean, required: true, default: false })
  twoFactorEnabled!: boolean;
  @Prop({ type: String, select: false })
  twoFactorSecretEncrypted?: string;
  @Prop({ type: Boolean, required: true, default: false })
  platformAdmin!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
  version!: number;
}

export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);
