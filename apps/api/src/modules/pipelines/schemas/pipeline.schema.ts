import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import type { CrmEntity } from '../../crm/crm.types.js';

@Schema({ _id: true })
export class PipelineStage {
  _id!: Types.ObjectId;
  @Prop({ type: String, required: true }) name!: string;
  @Prop({ type: Number, required: true, min: 0 }) order!: number;
  @Prop({ type: Number, min: 0, max: 100, default: 0 }) probability!: number;
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} }) rules!: Record<
    string,
    string | number | boolean
  >;
}
const PipelineStageSchema = SchemaFactory.createForClass(PipelineStage);

@Schema({ collection: 'pipelines', timestamps: true, versionKey: false })
export class Pipeline implements CrmEntity {
  _id!: Types.ObjectId;
  createdAt!: Date;
  updatedAt!: Date;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) createdBy!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) updatedBy!: Types.ObjectId;
  @Prop({ type: Number, default: 0 }) version!: number;
  @Prop({ type: Date, default: null }) deletedAt!: Date | null;
  @Prop({ type: String, required: true }) name!: string;
  @Prop({
    type: [PipelineStageSchema],
    validate: [(v: PipelineStage[]) => v.length > 0, 'At least one stage is required'],
  })
  stages!: PipelineStage[];
  @Prop({ type: String, enum: ['active', 'inactive'], default: 'active' }) status!: string;
  @Prop({ type: Boolean, default: false }) isDefault!: boolean;
}
export type PipelineDocument = HydratedDocument<Pipeline>;
export const PipelineSchema = SchemaFactory.createForClass(Pipeline);
PipelineSchema.index(
  { workspaceId: 1, isDefault: 1 },
  { unique: true, partialFilterExpression: { isDefault: true, deletedAt: null } },
);
PipelineSchema.index({ workspaceId: 1, status: 1, createdAt: -1 });
PipelineSchema.index({ workspaceId: 1, name: 'text' });
