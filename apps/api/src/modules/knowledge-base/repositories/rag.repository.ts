import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import { KnowledgeSource } from '../schemas/knowledge-source.schema.js';
import { KnowledgeChunk, KnowledgeDocument, KnowledgeIngestionJob, KnowledgeRetrievalLog, RagEvaluation } from '../schemas/rag.schemas.js';
import type { VectorFilters, VectorHit } from '../vector-search/vector-search.types.js';

@Injectable()
export class RagRepository {
  constructor(
    @InjectModel(KnowledgeSource.name) private readonly sources: Model<KnowledgeSource>,
    @InjectModel(KnowledgeDocument.name) private readonly documents: Model<KnowledgeDocument>,
    @InjectModel(KnowledgeChunk.name) private readonly chunks: Model<KnowledgeChunk>,
    @InjectModel(KnowledgeIngestionJob.name) private readonly jobs: Model<KnowledgeIngestionJob>,
    @InjectModel(KnowledgeRetrievalLog.name) private readonly logs: Model<KnowledgeRetrievalLog>,
    @InjectModel(RagEvaluation.name) private readonly evaluations: Model<RagEvaluation>,
  ) {}
  source(workspaceId: string, sourceId: string) { return this.sources.findOne({ _id: new Types.ObjectId(sourceId), workspaceId: new Types.ObjectId(workspaceId), status: { $ne: 'deleted' } }).lean<KnowledgeSource>().exec(); }
  existingDocument(workspaceId: string, sourceId: string, contentHash: string) { return this.documents.findOne({ workspaceId: new Types.ObjectId(workspaceId), sourceId: new Types.ObjectId(sourceId), contentHash, status: 'active' }).lean<KnowledgeDocument>().exec(); }
  createDocument(input: Record<string, unknown>) { return new this.documents(input).save(); }
  async replaceChunks(workspaceId: string, documentId: string, chunks: Array<Omit<KnowledgeChunk, '_id'>>) {
    await this.chunks.updateMany({ workspaceId: new Types.ObjectId(workspaceId), documentId: new Types.ObjectId(documentId), status: 'active' }, { $set: { status: 'deleted' } });
    if (chunks.length) await this.chunks.bulkWrite(chunks.map((document) => ({ updateOne: { filter: { workspaceId: document.workspaceId, documentId: document.documentId, ordinal: document.ordinal }, update: { $set: document }, upsert: true } })), { ordered: false });
  }
  reserveJob(workspaceId: string, sourceId: string, idempotencyKey: string) {
    return this.jobs.findOneAndUpdate({ workspaceId: new Types.ObjectId(workspaceId), idempotencyKey }, { $setOnInsert: { sourceId: new Types.ObjectId(sourceId), status: 'pending', currentStep: 'registered', completedSteps: [], attempts: 0 } }, { upsert: true, new: true }).lean<KnowledgeIngestionJob>().exec();
  }
  updateJob(workspaceId: string, jobId: string, update: Record<string, unknown>) { return this.jobs.findOneAndUpdate({ _id: new Types.ObjectId(jobId), workspaceId: new Types.ObjectId(workspaceId) }, update, { new: true }).lean().exec(); }
  ready(workspaceId: string, sourceId: string, contentHash: string) { return this.sources.updateOne({ _id: new Types.ObjectId(sourceId), workspaceId: new Types.ObjectId(workspaceId) }, { $set: { status: 'ready', contentHash, error: null } }); }
  fail(workspaceId: string, sourceId: string, error: string) { return this.sources.updateOne({ _id: new Types.ObjectId(sourceId), workspaceId: new Types.ObjectId(workspaceId) }, { $set: { status: 'failed', error: error.slice(0, 1000) } }); }
  async deleteSource(workspaceId: string, sourceId: string) {
    const scope = { workspaceId: new Types.ObjectId(workspaceId), sourceId: new Types.ObjectId(sourceId) };
    await Promise.all([this.chunks.updateMany(scope, { $set: { status: 'deleted', embedding: [] } }), this.documents.updateMany(scope, { $set: { status: 'deleted', normalizedText: '' } }), this.sources.updateOne({ _id: scope.sourceId, workspaceId: scope.workspaceId }, { $set: { status: 'deleted' } })]);
  }
  keywordSearch(workspaceId: string, query: string, filters: VectorFilters, limit: number) {
    const match: Record<string, unknown> = { workspaceId: new Types.ObjectId(workspaceId), status: 'active', $text: { $search: query } };
    if (filters.collectionIds?.length) match.collectionIds = { $in: filters.collectionIds };
    if (filters.sourceIds?.length) match.sourceId = { $in: filters.sourceIds.map((id) => new Types.ObjectId(id)) };
    if (filters.language) match.language = filters.language;
    for (const [key, value] of Object.entries(filters.metadata ?? {})) match[`metadata.${key}`] = value;
    return this.chunks.find(match).select('+text').select({ score: { $meta: 'textScore' } }).sort({ score: { $meta: 'textScore' } }).limit(Math.min(limit, 50)).lean<VectorHit[]>().exec();
  }
  logRetrieval(value: Record<string, unknown>) { return new this.logs(value).save(); }
  evaluate(value: Record<string, unknown>) { return new this.evaluations(value).save(); }
}
