import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ collection: 'login_attempts', timestamps: true, versionKey: false })
export class LoginAttempt {
  _id!: Types.ObjectId;
  @Prop({ type: String, required: true })
  emailHash!: string;
  @Prop({ type: String, required: true })
  ipHash!: string;
  @Prop({ type: Boolean, required: true })
  successful!: boolean;
  @Prop({ type: String })
  failureReason?: string;
  createdAt!: Date;
}
export const LoginAttemptSchema = SchemaFactory.createForClass(LoginAttempt);
