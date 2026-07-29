import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types, type HydratedDocument } from 'mongoose';
@Schema({ collection: 'knowledge_sources', timestamps: true, versionKey: false })
export class KnowledgeSource {
  _id!: Types.ObjectId;
  createdAt!: Date;
  updatedAt!: Date;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: String, required: true }) name!: string;
  @Prop({ type: String, enum: ['uploaded_document', 'website', 'faq', 'manual_text', 'crm_record', 'catalog', 'file', 'url', 'text'], required: true }) sourceType!: string;
  @Prop({ type: String, required: true }) sourceReference!: string;
  @Prop({ type: String, enum: ['pending', 'processing', 'ready', 'failed', 'deleted'], default: 'pending' })
  status!: string;
  @Prop({ type: String, required: true }) idempotencyKey!: string;
  @Prop({ type: String, default: null }) contentHash!: string | null;
  @Prop({ type: [String], default: [] }) collectionIds!: string[];
  @Prop({ type: String, default: 'untrusted' }) trustLevel!: 'trusted' | 'untrusted';
  @Prop({ type: String, default: null }) error!: string | null;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) createdBy!: Types.ObjectId;
}
export type KnowledgeSourceDocument = HydratedDocument<KnowledgeSource>;
export const KnowledgeSourceSchema = SchemaFactory.createForClass(KnowledgeSource);
KnowledgeSourceSchema.index({ workspaceId: 1, idempotencyKey: 1 }, { unique: true });
KnowledgeSourceSchema.index({ workspaceId: 1, status: 1, createdAt: 1 });
