import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';

@Schema({ collection: 'two_factor_recovery_codes', timestamps: true, versionKey: false })
export class TwoFactorRecoveryCode {
  _id!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  userId!: Types.ObjectId;
  @Prop({ type: String, required: true, select: false })
  codeHash!: string;
  @Prop({ type: Date })
  usedAt?: Date;
}
export const TwoFactorRecoveryCodeSchema = SchemaFactory.createForClass(TwoFactorRecoveryCode);
