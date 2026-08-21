import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import { KnowledgeSource } from '../schemas/knowledge-source.schema.js';
import {
  KnowledgeChunk,
  KnowledgeAnswerReview,
  KnowledgeDocument,
  KnowledgeIngestionJob,
  KnowledgeRetrievalLog,
  RagEvaluation,
  RagDriftSnapshot,
} from '../schemas/rag.schemas.js';
import type { VectorFilters, VectorHit } from '../vector-search/vector-search.types.js';

@Injectable()
export class RagRepository {
  constructor(
    @InjectModel(KnowledgeSource.name) private readonly sources: Model<KnowledgeSource>,
    @InjectModel(KnowledgeDocument.name) private readonly documents: Model<KnowledgeDocument>,
    @InjectModel(KnowledgeChunk.name) private readonly chunks: Model<KnowledgeChunk>,
    @InjectModel(KnowledgeIngestionJob.name) private readonly jobs: Model<KnowledgeIngestionJob>,
    @InjectModel(KnowledgeRetrievalLog.name) private readonly logs: Model<KnowledgeRetrievalLog>,
    @InjectModel(KnowledgeAnswerReview.name)
    private readonly answerReviews: Model<KnowledgeAnswerReview>,
    @InjectModel(RagEvaluation.name) private readonly evaluations: Model<RagEvaluation>,
    @InjectModel(RagDriftSnapshot.name) private readonly driftSnapshots: Model<RagDriftSnapshot>,
  ) {}
  source(workspaceId: string, sourceId: string) {
    return this.sources
      .findOne({
        _id: new Types.ObjectId(sourceId),
        workspaceId: new Types.ObjectId(workspaceId),
        status: { $ne: 'deleted' },
      })
      .lean<KnowledgeSource>()
      .exec();
  }
  existingDocument(workspaceId: string, sourceId: string, contentHash: string) {
    return this.documents
      .findOne({
        workspaceId: new Types.ObjectId(workspaceId),
        sourceId: new Types.ObjectId(sourceId),
        contentHash,
        status: 'active',
      })
      .lean<KnowledgeDocument>()
      .exec();
  }
  createDocument(input: Record<string, unknown>) {
    return new this.documents(input).save();
  }
  async nextRevision(workspaceId: string, sourceId: string) {
    const latest = await this.documents
      .findOne({ workspaceId: new Types.ObjectId(workspaceId), sourceId: new Types.ObjectId(sourceId) })
      .sort({ revision: -1 })
      .select({ revision: 1 })
      .lean<{ revision?: number }>()
      .exec();
    return (latest?.revision ?? 0) + 1;
  }
  async replaceChunks(
    workspaceId: string,
    documentId: string,
    chunks: Array<Omit<KnowledgeChunk, '_id'>>,
  ) {
    await this.chunks.updateMany(
      {
        workspaceId: new Types.ObjectId(workspaceId),
        documentId: new Types.ObjectId(documentId),
        status: 'active',
      },
      { $set: { status: 'deleted' } },
    );
    if (chunks.length)
      await this.chunks.bulkWrite(
        chunks.map((document) => ({
          updateOne: {
            filter: {
              workspaceId: document.workspaceId,
              documentId: document.documentId,
              ordinal: document.ordinal,
            },
            update: { $set: document },
            upsert: true,
          },
        })),
        { ordered: false },
      );
  }
  reserveJob(workspaceId: string, sourceId: string, idempotencyKey: string) {
    return this.jobs
      .findOneAndUpdate(
        { workspaceId: new Types.ObjectId(workspaceId), idempotencyKey },
        {
          $setOnInsert: {
            sourceId: new Types.ObjectId(sourceId),
            status: 'pending',
            currentStep: 'registered',
            completedSteps: [],
            attempts: 0,
          },
        },
        { upsert: true, new: true },
      )
      .lean<KnowledgeIngestionJob>()
      .exec();
  }
  updateJob(workspaceId: string, jobId: string, update: Record<string, unknown>) {
    return this.jobs
      .findOneAndUpdate(
        { _id: new Types.ObjectId(jobId), workspaceId: new Types.ObjectId(workspaceId) },
        update,
        { new: true },
      )
      .lean()
      .exec();
  }
  ready(workspaceId: string, sourceId: string, contentHash: string) {
    return this.sources.updateOne(
      { _id: new Types.ObjectId(sourceId), workspaceId: new Types.ObjectId(workspaceId) },
      { $set: { status: 'ready', contentHash, error: null } },
    );
  }
  fail(workspaceId: string, sourceId: string, error: string) {
    return this.sources.updateOne(
      { _id: new Types.ObjectId(sourceId), workspaceId: new Types.ObjectId(workspaceId) },
      { $set: { status: 'failed', error: error.slice(0, 1000) } },
    );
  }
  async deleteSource(workspaceId: string, sourceId: string) {
    const scope = {
      workspaceId: new Types.ObjectId(workspaceId),
      sourceId: new Types.ObjectId(sourceId),
    };
    await Promise.all([
      this.chunks.updateMany(scope, { $set: { status: 'deleted', embedding: [] } }),
      this.documents.updateMany(scope, { $set: { status: 'deleted', normalizedText: '' } }),
      this.sources.updateOne(
        { _id: scope.sourceId, workspaceId: scope.workspaceId },
        { $set: { status: 'deleted' } },
      ),
    ]);
  }
  keywordSearch(workspaceId: string, query: string, filters: VectorFilters, limit: number) {
    if (!Types.ObjectId.isValid(workspaceId))
      throw new Error('Atlas Search requires a valid workspace filter');
    const workspace = new Types.ObjectId(workspaceId);
    if (!filters.accessControlUserId)
      throw new Error('Atlas Search requires an authenticated access principal');
    const filter: Array<Record<string, unknown>> = [
      { equals: { path: 'workspaceId', value: workspace } },
      { equals: { path: 'status', value: filters.status ?? 'active' } },
      {
        compound: {
          should: [
            { in: { path: 'accessControl.visibility', value: ['workspace', 'public'] } },
            { equals: { path: 'accessControl.userIds', value: filters.accessControlUserId } },
            ...(filters.accessControlGroups?.length
              ? [{ in: { path: 'accessControl.groups', value: filters.accessControlGroups } }]
              : []),
          ],
          minimumShouldMatch: 1,
        },
      },
    ];
    if (filters.collectionIds?.length)
      filter.push({ in: { path: 'collectionIds', value: filters.collectionIds } });
    if (filters.sourceIds?.length)
      filter.push({
        in: { path: 'sourceId', value: filters.sourceIds.map((id) => new Types.ObjectId(id)) },
      });
    if (filters.documentIds?.length)
      filter.push({
        in: { path: 'documentId', value: filters.documentIds.map((id) => new Types.ObjectId(id)) },
      });
    if (filters.language) filter.push({ equals: { path: 'language', value: filters.language } });
    if (filters.contentType)
      filter.push({ equals: { path: 'metadata.contentType', value: filters.contentType } });
    if (filters.createdAfter || filters.createdBefore)
      filter.push({
        range: {
          path: 'createdAt',
          ...(filters.createdAfter ? { gte: filters.createdAfter } : {}),
          ...(filters.createdBefore ? { lte: filters.createdBefore } : {}),
        },
      });
    for (const [key, value] of Object.entries(filters.metadata ?? {}))
      filter.push({ equals: { path: `metadata.${key}`, value } });
    const pipeline = [
      {
        $search: {
          index: 'knowledge-chunks-keyword',
          compound: {
            must: [{ text: { query, path: ['text', 'heading', 'sectionHierarchy'] } }],
            filter,
          },
        },
      },
      { $limit: Math.min(limit, 100) },
      {
        $project: {
          workspaceId: 1,
          sourceId: 1,
          documentId: 1,
          collectionIds: 1,
          language: 1,
          status: 1,
          text: 1,
          metadata: 1,
          accessControl: 1,
          untrusted: 1,
          injectionDetected: 1,
          score: { $meta: 'searchScore' },
        },
      },
    ];
    return this.chunks
      .aggregate<VectorHit>(pipeline)
      .exec()
      .then((hits) => {
        if (hits.some((hit) => String(hit.workspaceId) !== workspaceId))
          throw new Error('Cross-tenant keyword result rejected');
        return hits;
      });
  }
  logRetrieval(value: Record<string, unknown>) {
    return new this.logs(value).save();
  }
  annotateRetrieval(retrievalTraceId: string, workspaceId: string, value: Record<string, unknown>) {
    return this.logs.updateOne(
      { retrievalTraceId, workspaceId: new Types.ObjectId(workspaceId) },
      { $set: value },
    );
  }
  routeAnswerReview(value: Record<string, unknown>) {
    return new this.answerReviews(value).save();
  }
  evaluate(value: { workspaceId: string; experimentId: string } & Record<string, unknown>) {
    return this.evaluations.findOneAndUpdate(
      { workspaceId: value.workspaceId, experimentId: value.experimentId },
      { $set: value },
      { upsert: true, new: true },
    );
  }
  recordDrift(
    value: { workspaceId: string; windowStart: Date; windowEnd: Date } & Record<string, unknown>,
  ) {
    return this.driftSnapshots.findOneAndUpdate(
      {
        workspaceId: value.workspaceId,
        windowStart: value.windowStart,
        windowEnd: value.windowEnd,
      },
      { $set: value },
      { upsert: true, new: true },
    );
  }
}
