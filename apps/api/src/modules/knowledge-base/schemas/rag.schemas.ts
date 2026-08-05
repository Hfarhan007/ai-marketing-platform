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
  @Prop({ type: String, required: true }) revisionId!: string;
  @Prop({ type: Number, required: true }) ordinal!: number;
  @Prop({ type: String, required: true, select: false }) text!: string;
  @Prop({ type: String, required: true }) textHash!: string;
  @Prop({ type: [Number], required: true, select: false }) embedding!: number[];
  @Prop({ type: String, required: true }) embeddingVersion!: string;
  @Prop({ type: String, required: true }) embeddingProvider!: string;
  @Prop({ type: String, required: true }) embeddingModel!: string;
  @Prop({ type: Number, required: true }) vectorDimension!: number;
  @Prop({ type: String, enum: ['active', 'stale', 'failed', 'cancelled'], default: 'active' })
  embeddingStatus!: string;
  @Prop({ type: String, default: null }) embeddingError!: string | null;
  @Prop({ type: Number, default: 0 }) embeddingTokenUsage!: number;
  @Prop({ type: Number, default: 0 }) embeddingCostUsd!: number;
  @Prop({ type: Date, default: Date.now }) embeddingCreatedAt!: Date;
  @Prop({ type: String, required: true }) chunkingVersion!: string;
  @Prop({ type: String, required: true }) language!: string;
  @Prop({ type: Number, default: null }) pageNumber!: number | null;
  @Prop({ type: [String], default: [] }) sectionHierarchy!: string[];
  @Prop({ type: String, default: null }) heading!: string | null;
  @Prop({ type: String, default: '' }) precedingContext!: string;
  @Prop({ type: String, default: '' }) followingContext!: string;
  @Prop({ type: Number, required: true }) tokenCount!: number;
  @Prop({ type: String, required: true }) boundaryReason!: string;
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} }) accessControl!: Record<string, unknown>;
  @Prop({ type: String, enum: ['content', 'parent', 'summary'], default: 'content' })
  chunkType!: string;
  @Prop({ type: String, default: null }) parentId!: string | null;
  @Prop({ type: [String], default: [] }) childIds!: string[];
  @Prop({ type: String, default: null }) nearDuplicateOf!: string | null;
  @Prop({ type: String, enum: ['active', 'deleted'], default: 'active' }) status!: string;
  @Prop({ type: Boolean, default: true }) untrusted!: boolean;
  @Prop({ type: Boolean, default: false }) injectionDetected!: boolean;
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} }) metadata!: Record<string, unknown>;
}
export const KnowledgeChunkSchema = SchemaFactory.createForClass(KnowledgeChunk);
KnowledgeChunkSchema.index({ workspaceId: 1, documentId: 1, ordinal: 1 }, { unique: true });
KnowledgeChunkSchema.index({ workspaceId: 1, text: 'text' });

@Schema({ collection: 'knowledge_embeddings', timestamps: true, versionKey: false })
export class KnowledgeEmbedding {
  _id!: Types.ObjectId;
  createdAt!: Date;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) chunkId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) documentId!: Types.ObjectId;
  @Prop({ type: String, required: true }) provider!: string;
  @Prop({ type: String, required: true }) model!: string;
  @Prop({ type: Number, required: true, min: 1 }) vectorDimension!: number;
  @Prop({ type: String, required: true }) embeddingVersion!: string;
  @Prop({ type: String, required: true }) contentHash!: string;
  @Prop({ type: [Number], required: true, select: false }) vector!: number[];
  @Prop({
    type: String,
    enum: ['pending', 'active', 'transition', 'stale', 'failed', 'cancelled'],
    default: 'pending',
  })
  status!: string;
  @Prop({ type: String, default: null }) error!: string | null;
  @Prop({ type: Number, default: 0 }) tokenUsage!: number;
  @Prop({ type: Number, default: 0 }) costUsd!: number;
  @Prop({ type: String, required: true }) indexName!: string;
}
export const KnowledgeEmbeddingSchema = SchemaFactory.createForClass(KnowledgeEmbedding);
KnowledgeEmbeddingSchema.index(
  { workspaceId: 1, chunkId: 1, embeddingVersion: 1, contentHash: 1 },
  { unique: true },
);
KnowledgeEmbeddingSchema.index({ workspaceId: 1, indexName: 1, status: 1 });

@Schema({ collection: 'knowledge_embedding_jobs', timestamps: true, versionKey: false })
export class KnowledgeEmbeddingJob {
  _id!: Types.ObjectId;
  createdAt!: Date;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: String, required: true }) provider!: string;
  @Prop({ type: String, required: true }) model!: string;
  @Prop({ type: String, required: true }) embeddingVersion!: string;
  @Prop({ type: String, required: true }) targetIndex!: string;
  @Prop({ type: String, default: null }) sourceVersion!: string | null;
  @Prop({
    type: String,
    enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
    default: 'pending',
  })
  status!: string;
  @Prop({ type: Number, default: 0 }) processed!: number;
  @Prop({ type: Number, default: 0 }) total!: number;
  @Prop({ type: Number, default: 0 }) tokenUsage!: number;
  @Prop({ type: Number, default: 0 }) costUsd!: number;
  @Prop({ type: String, default: null }) error!: string | null;
  @Prop({ type: Date, default: null }) cancelledAt!: Date | null;
}
export const KnowledgeEmbeddingJobSchema = SchemaFactory.createForClass(KnowledgeEmbeddingJob);
KnowledgeEmbeddingJobSchema.index({ workspaceId: 1, status: 1, createdAt: 1 });

@Schema({ collection: 'knowledge_ingestion_jobs', timestamps: true, versionKey: false })
export class KnowledgeIngestionJob {
  _id!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) sourceId!: Types.ObjectId;
  @Prop({ type: String, required: true }) idempotencyKey!: string;
  @Prop({
    type: String,
    enum: ['pending', 'running', 'failed', 'completed', 'cancelled'],
    default: 'pending',
  })
  status!: string;
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
  @Prop({ type: String, required: true, unique: true }) retrievalTraceId!: string;
  @Prop({ type: String, required: true }) queryHash!: string;
  @Prop({ type: String, required: true }) userId!: string;
  @Prop({ type: String, enum: ['low', 'medium', 'high'], required: true }) queryRisk!: string;
  @Prop({ type: Boolean, default: false }) suspiciousQuery!: boolean;
  @Prop({ type: MongooseSchema.Types.Mixed, default: [] }) suspiciousQueryReasons!: string[];
  @Prop({ type: MongooseSchema.Types.Mixed, required: true }) accessPrincipal!: Record<
    string,
    unknown
  >;
  @Prop({ type: MongooseSchema.Types.Mixed, required: true }) results!: Array<{
    chunkId: string;
    score: number;
  }>;
  @Prop({ type: Number, required: true }) durationMs!: number;
  @Prop({ type: MongooseSchema.Types.Mixed, default: [] }) stages!: Array<{
    name: string;
    durationMs: number;
    inputCount?: number;
    outputCount?: number;
    detail?: Record<string, unknown>;
  }>;
}
export const KnowledgeRetrievalLogSchema = SchemaFactory.createForClass(KnowledgeRetrievalLog);

@Schema({ collection: 'knowledge_answer_reviews', timestamps: true, versionKey: false })
export class KnowledgeAnswerReview {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: String, required: true }) retrievalTraceId!: string;
  @Prop({ type: String, required: true }) userId!: string;
  @Prop({ type: String, enum: ['groundedness'], default: 'groundedness' }) queue!: string;
  @Prop({ type: String, enum: ['pending', 'in_review', 'resolved'], default: 'pending' })
  status!: string;
  @Prop({ type: Number, min: 0, max: 1, required: true }) groundedness!: number;
  @Prop({ type: MongooseSchema.Types.Mixed, default: [] }) warnings!: string[];
  @Prop({ type: MongooseSchema.Types.Mixed, required: true }) answer!: Record<string, unknown>;
}
export const KnowledgeAnswerReviewSchema = SchemaFactory.createForClass(KnowledgeAnswerReview);
KnowledgeAnswerReviewSchema.index({ workspaceId: 1, status: 1, createdAt: 1 });

@Schema({ collection: 'knowledge_rag_evaluations', timestamps: true, versionKey: false })
export class RagEvaluation {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: String, required: true }) experimentId!: string;
  @Prop({ type: String, required: true }) datasetName!: string;
  @Prop({ type: String, required: true }) datasetVersion!: string;
  @Prop({ type: String, required: true }) datasetHash!: string;
  @Prop({ type: MongooseSchema.Types.Mixed, required: true }) configuration!: Record<
    string,
    unknown
  >;
  @Prop({ type: MongooseSchema.Types.Mixed, required: true }) automatedMetrics!: Record<
    string,
    number
  >;
  @Prop({ type: MongooseSchema.Types.Mixed, required: true }) humanReview!: Record<string, unknown>;
  @Prop({ type: MongooseSchema.Types.Mixed, required: true }) thresholds!: Record<string, unknown>;
  @Prop({ type: Boolean, required: true }) passed!: boolean;
  @Prop({ type: Boolean, required: true }) rolloutBlocked!: boolean;
  @Prop({ type: [String], default: [] }) failures!: string[];
  @Prop({ type: Number, required: true }) caseCount!: number;
  @Prop({ type: MongooseSchema.Types.Mixed, required: true }) reproducibility!: Record<
    string,
    unknown
  >;
}
export const RagEvaluationSchema = SchemaFactory.createForClass(RagEvaluation);
RagEvaluationSchema.index({ workspaceId: 1, experimentId: 1 }, { unique: true });

@Schema({ collection: 'knowledge_rag_drift_snapshots', timestamps: true, versionKey: false })
export class RagDriftSnapshot {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: Date, required: true }) windowStart!: Date;
  @Prop({ type: Date, required: true }) windowEnd!: Date;
  @Prop({ type: Number, required: true }) sampleSize!: number;
  @Prop({ type: Number, required: true }) zeroResultRate!: number;
  @Prop({ type: Number, required: true }) lowScoreRetrievalRate!: number;
  @Prop({ type: Number, required: true }) latencyMs!: number;
  @Prop({ type: Number, required: true }) embeddingCostUsd!: number;
  @Prop({ type: Number, required: true }) generationCostUsd!: number;
  @Prop({ type: [String], default: [] }) alerts!: string[];
}
export const RagDriftSnapshotSchema = SchemaFactory.createForClass(RagDriftSnapshot);
RagDriftSnapshotSchema.index({ workspaceId: 1, windowStart: 1, windowEnd: 1 }, { unique: true });
