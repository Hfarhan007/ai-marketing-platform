import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types, type HydratedDocument } from 'mongoose';

@Schema({
  collection: 'workspace_settings',
  timestamps: true,
  versionKey: 'version',
  optimisticConcurrency: true,
})
export class WorkspaceSettings {
  _id!: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  workspaceId!: Types.ObjectId;
  @Prop({ type: Number, required: true, default: 1, min: 0, max: 6 })
  weekStartsOn!: number;
  @Prop({ type: String, required: true, default: 'yyyy-MM-dd' })
  dateFormat!: string;
  @Prop({ type: String, required: true, enum: ['12h', '24h'], default: '12h' })
  timeFormat!: '12h' | '24h';
  @Prop({ type: MongooseSchema.Types.ObjectId })
  defaultPipelineId?: Types.ObjectId;
  @Prop({ type: Number, required: true, default: 365, min: 1 })
  dataRetentionDays!: number;
  createdAt!: Date;
  updatedAt!: Date;
  version!: number;
}

export type WorkspaceSettingsDocument = HydratedDocument<WorkspaceSettings>;
export const WorkspaceSettingsSchema = SchemaFactory.createForClass(WorkspaceSettings);
