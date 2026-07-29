import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';

@Schema({ collection: 'knowledge_documents', timestamps: true, versionKey: false })
export class KnowledgeDocument {
  _id!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) sourceId!: Types.ObjectId;
  @Prop({ type: String, required: true }) contentHash!: string;
  @Prop({ type: String, required: true, select: false }) normalizedText!: string;
  @Prop({ type: String, required: true }) language!: string;
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} }) metadata!: Record<string, unknown>;
  @Prop({ type: String, enum: ['active', 'deleted'], default: 'active' }) status!: string;
}
export const KnowledgeDocumentSchema = SchemaFactory.createForClass(KnowledgeDocument);
KnowledgeDocumentSchema.index({ workspaceId: 1, sourceId: 1, contentHash: 1 }, { unique: true });

@Schema({ collection: 'knowledge_chunks', timestamps: true, versionKey: false })
export class KnowledgeChunk {
  _id!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: [String], required: true }) collectionIds!: string[];
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) sourceId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) documentId!: Types.ObjectId;
  @Prop({ type: Number, required: true }) ordinal!: number;
  @Prop({ type: String, required: true, select: false }) text!: string;
  @Prop({ type: String, required: true }) textHash!: string;
  @Prop({ type: [Number], required: true, select: false }) embedding!: number[];
  @Prop({ type: String, required: true }) embeddingVersion!: string;
  @Prop({ type: String, required: true }) chunkingVersion!: string;
  @Prop({ type: String, required: true }) language!: string;
  @Prop({ type: String, enum: ['active', 'deleted'], default: 'active' }) status!: string;
  @Prop({ type: Boolean, default: true }) untrusted!: boolean;
  @Prop({ type: Boolean, default: false }) injectionDetected!: boolean;
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} }) metadata!: Record<string, unknown>;
}
export const KnowledgeChunkSchema = SchemaFactory.createForClass(KnowledgeChunk);
KnowledgeChunkSchema.index({ workspaceId: 1, documentId: 1, ordinal: 1 }, { unique: true });
KnowledgeChunkSchema.index({ workspaceId: 1, text: 'text' });

@Schema({ collection: 'knowledge_ingestion_jobs', timestamps: true, versionKey: false })
export class KnowledgeIngestionJob {
  _id!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) sourceId!: Types.ObjectId;
  @Prop({ type: String, required: true }) idempotencyKey!: string;
  @Prop({ type: String, enum: ['pending', 'running', 'failed', 'completed', 'cancelled'], default: 'pending' }) status!: string;
  @Prop({ type: String, default: 'registered' }) currentStep!: string;
  @Prop({ type: [String], default: [] }) completedSteps!: string[];
  @Prop({ type: Number, default: 0 }) attempts!: number;
  @Prop({ type: String, default: null }) checkpoint!: string | null;
  @Prop({ type: String, default: null }) error!: string | null;
}
export const KnowledgeIngestionJobSchema = SchemaFactory.createForClass(KnowledgeIngestionJob);
KnowledgeIngestionJobSchema.index({ workspaceId: 1, idempotencyKey: 1 }, { unique: true });

@Schema({ collection: 'knowledge_retrieval_logs', timestamps: true, versionKey: false })
export class KnowledgeRetrievalLog {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: String, required: true }) correlationId!: string;
  @Prop({ type: String, required: true }) queryHash!: string;
  @Prop({ type: MongooseSchema.Types.Mixed, required: true }) results!: Array<{ chunkId: string; score: number }>;
  @Prop({ type: Number, required: true }) durationMs!: number;
}
export const KnowledgeRetrievalLogSchema = SchemaFactory.createForClass(KnowledgeRetrievalLog);

@Schema({ collection: 'knowledge_rag_evaluations', timestamps: true, versionKey: false })
export class RagEvaluation {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: String, required: true }) correlationId!: string;
  @Prop({ type: Number, min: 0, max: 1, required: true }) relevance!: number;
  @Prop({ type: Number, min: 0, max: 1, required: true }) groundedness!: number;
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} }) metadata!: Record<string, unknown>;
}
export const RagEvaluationSchema = SchemaFactory.createForClass(RagEvaluation);
