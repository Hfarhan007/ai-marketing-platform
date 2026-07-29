import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types, type ClientSession, type Model } from 'mongoose';
import {
  KnowledgeSource,
  type KnowledgeSourceDocument,
} from '../schemas/knowledge-source.schema.js';
@Injectable()
export class KnowledgeSourceRepository {
  constructor(
    @InjectModel(KnowledgeSource.name) private readonly sources: Model<KnowledgeSourceDocument>,
  ) {}
  async reserve(
    workspaceId: string,
    userId: string,
    input: { name: string; sourceType: string; sourceReference: string; idempotencyKey: string; collectionIds?: string[] },
    session: ClientSession,
  ) {
    const existing = await this.sources
      .findOne({
        workspaceId: new Types.ObjectId(workspaceId),
        idempotencyKey: input.idempotencyKey,
      })
      .session(session)
      .lean<KnowledgeSource>()
      .exec();
    if (existing) return { source: existing, duplicate: true };
    const source = new this.sources({
      ...input,
      workspaceId: new Types.ObjectId(workspaceId),
      createdBy: new Types.ObjectId(userId),
      status: 'pending',
    });
    await source.save({ session });
    return { source: source.toObject(), duplicate: false };
  }
}
