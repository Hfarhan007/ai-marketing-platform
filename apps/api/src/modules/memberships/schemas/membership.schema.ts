import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types, type HydratedDocument } from 'mongoose';

export enum MembershipStatus {
  Invited = 'invited',
  Active = 'active',
  Suspended = 'suspended',
}

@Schema({ collection: 'memberships', timestamps: true, versionKey: 'version', optimisticConcurrency: true })
export class Membership {
  _id!: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  workspaceId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  userId!: Types.ObjectId;
  @Prop({ type: [MongooseSchema.Types.ObjectId], required: true, default: () => [] })
  roleIds!: Types.ObjectId[];
  @Prop({ type: String, enum: MembershipStatus, required: true, default: MembershipStatus.Invited })
  status!: MembershipStatus;
  @Prop({ type: MongooseSchema.Types.ObjectId })
  invitedBy?: Types.ObjectId;
  @Prop({ type: Date })
  joinedAt?: Date;
  @Prop({ type: Date })
  suspendedAt?: Date;
  @Prop({ type: String, select: false })
  inviteTokenHash?: string;
  @Prop({ type: Date })
  inviteExpiresAt?: Date;
  createdAt!: Date;
  updatedAt!: Date;
  version!: number;
}

export type MembershipDocument = HydratedDocument<Membership>;
export const MembershipSchema = SchemaFactory.createForClass(Membership);
