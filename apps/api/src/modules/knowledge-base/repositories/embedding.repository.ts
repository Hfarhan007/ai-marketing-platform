import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import {
  KnowledgeChunk,
  KnowledgeEmbedding,
  KnowledgeEmbeddingJob,
} from '../schemas/rag.schemas.js';

@Injectable()
export class EmbeddingRepository {
  constructor(
    @InjectModel(KnowledgeChunk.name) private readonly chunks: Model<KnowledgeChunk>,
    @InjectModel(KnowledgeEmbedding.name) private readonly embeddings: Model<KnowledgeEmbedding>,
    @InjectModel(KnowledgeEmbeddingJob.name) private readonly jobs: Model<KnowledgeEmbeddingJob>,
  ) {}

  reusable(workspaceId: string, chunkId: string, version: string, contentHash: string) {
    return this.embeddings
      .findOne({
        workspaceId: new Types.ObjectId(workspaceId),
        chunkId: new Types.ObjectId(chunkId),
        embeddingVersion: version,
        contentHash,
        status: { $in: ['active', 'transition'] },
      })
      .select('+vector')
      .lean<KnowledgeEmbedding>()
      .exec();
  }
  async assertIndexDimension(workspaceId: string, indexName: string, dimension: number) {
    const current = await this.embeddings
      .findOne({
        workspaceId: new Types.ObjectId(workspaceId),
        indexName,
        status: { $in: ['active', 'transition'] },
      })
      .lean<KnowledgeEmbedding>()
      .exec();
    if (current && current.vectorDimension !== dimension)
      throw new Error(`Index ${indexName} requires ${current.vectorDimension}-dimension vectors`);
  }
  save(value: Record<string, unknown>) {
    return this.embeddings
      .findOneAndUpdate(
        {
          workspaceId: value.workspaceId,
          chunkId: value.chunkId,
          embeddingVersion: value.embeddingVersion,
          contentHash: value.contentHash,
        } as never,
        { $set: value },
        { upsert: true, new: true },
      )
      .lean<KnowledgeEmbedding>()
      .exec();
  }
  markFailed(value: Record<string, unknown>) {
    return this.embeddings
      .findOneAndUpdate(
        {
          workspaceId: value.workspaceId,
          chunkId: value.chunkId,
          embeddingVersion: value.embeddingVersion,
          contentHash: value.contentHash,
        } as never,
        { $set: value },
        { upsert: true, new: true },
      )
      .lean<KnowledgeEmbedding>()
      .exec();
  }
  markStale(workspaceId: string, chunkId: string, contentHash: string) {
    return this.embeddings.updateMany(
      {
        workspaceId: new Types.ObjectId(workspaceId),
        chunkId: new Types.ObjectId(chunkId),
        contentHash: { $ne: contentHash },
        status: { $in: ['active', 'transition'] },
      },
      { $set: { status: 'stale' } },
    );
  }
  chunksForJob(workspaceId: string) {
    return this.chunks
      .find({ workspaceId: new Types.ObjectId(workspaceId), status: 'active' })
      .select('+text')
      .lean<KnowledgeChunk[]>()
      .exec();
  }
  createJob(value: Record<string, unknown>) {
    return new this.jobs(value).save();
  }
  job(workspaceId: string, jobId: string) {
    return this.jobs
      .findOne({ _id: new Types.ObjectId(jobId), workspaceId: new Types.ObjectId(workspaceId) })
      .lean<KnowledgeEmbeddingJob>()
      .exec();
  }
  updateJob(workspaceId: string, jobId: string, update: Record<string, unknown>) {
    return this.jobs
      .findOneAndUpdate(
        { _id: new Types.ObjectId(jobId), workspaceId: new Types.ObjectId(workspaceId) },
        update,
        { new: true },
      )
      .lean<KnowledgeEmbeddingJob>()
      .exec();
  }
  cancelJob(workspaceId: string, jobId: string) {
    return this.jobs
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(jobId),
          workspaceId: new Types.ObjectId(workspaceId),
          status: { $in: ['pending', 'running'] },
        },
        { $set: { status: 'cancelled', cancelledAt: new Date() } },
        { new: true },
      )
      .lean<KnowledgeEmbeddingJob>()
      .exec();
  }
  activateMigration(workspaceId: string, newVersion: string) {
    return Promise.all([
      this.embeddings.updateMany(
        {
          workspaceId: new Types.ObjectId(workspaceId),
          embeddingVersion: newVersion,
          status: 'transition',
        },
        { $set: { status: 'active' } },
      ),
      this.embeddings.updateMany(
        {
          workspaceId: new Types.ObjectId(workspaceId),
          embeddingVersion: { $ne: newVersion },
          status: 'active',
        },
        { $set: { status: 'stale' } },
      ),
    ]);
  }
}
