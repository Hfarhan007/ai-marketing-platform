import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createHash } from 'node:crypto';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import { AiMemoryRecord, type MemoryType } from '../ai-memory.schema.js';
import type { MemoryCandidate } from '../memory/memory-extraction.policy.js';
import { shouldSupersede } from '../memory/memory-resolution.js';

@Injectable()
export class AiMemoryRepository {
  constructor(@InjectModel(AiMemoryRecord.name) private readonly records: Model<AiMemoryRecord>) {}

  async remember(input: Omit<MemoryCandidate, 'content'> & { workspaceId: string; storageTier: 'short_term' | 'long_term'; content: unknown; normalizedSummary: string; consentBasis: AiMemoryRecord['consentBasis']; retentionExpiry: Date }) {
    const workspaceId = new Types.ObjectId(input.workspaceId), subjectId = new Types.ObjectId(input.subjectId);
    const contentHash = createHash('sha256').update(JSON.stringify(input.content)).digest('hex');
    const existing = await this.records.find({ workspaceId, subjectId, subjectType: input.subjectType, memoryType: input.memoryType, factKey: input.factKey, status: 'active', retentionExpiry: { $gt: new Date() } }).select('+content +normalizedSummary').lean<AiMemoryRecord[]>().exec();
    const same = existing.find((record) => record.contentHash === contentHash);
    if (same) {
      await this.records.updateOne({ _id: same._id, workspaceId }, { $set: { lastUsedAt: new Date(), confidence: Math.max(same.confidence, input.confidence) } });
      return { record: same, contradictions: [] };
    }
    const contradictory = existing.filter((record) => record.contentHash !== contentHash);
    const wins = shouldSupersede(input, contradictory);
    const record = await new this.records({ ...input, workspaceId, subjectId, contentHash, lastUsedAt: new Date(), status: wins ? 'active' : 'contradicted', contradicts: contradictory.map(({ _id }) => _id) }).save();
    if (contradictory.length) await this.records.updateMany({ _id: { $in: contradictory.map(({ _id }) => _id) }, workspaceId }, { ...(wins ? { $set: { status: 'superseded' } } : {}), $addToSet: { contradicts: record._id } });
    return { record: record.toObject(), contradictions: contradictory };
  }

  recall(input: { workspaceId: string; subjectType?: string; subjectId: string; memoryTypes?: MemoryType[]; limit: number }) {
    return this.records.find({ workspaceId: new Types.ObjectId(input.workspaceId), subjectId: new Types.ObjectId(input.subjectId), ...(input.subjectType ? { subjectType: input.subjectType } : {}), ...(input.memoryTypes?.length ? { memoryType: { $in: input.memoryTypes } } : {}), status: 'active', retentionExpiry: { $gt: new Date() } }).select('+content +normalizedSummary +embedding').sort({ verified: -1, lastUsedAt: -1, confidence: -1 }).limit(Math.min(input.limit, 50)).lean<AiMemoryRecord[]>().exec();
  }
  async touch(workspaceId: string, ids: Types.ObjectId[]) { if (ids.length) await this.records.updateMany({ _id: { $in: ids }, workspaceId: new Types.ObjectId(workspaceId) }, { $set: { lastUsedAt: new Date() } }); }
  review(workspaceId: string, subjectId: string) { return this.records.find({ workspaceId: new Types.ObjectId(workspaceId), subjectId: new Types.ObjectId(subjectId), retentionExpiry: { $gt: new Date() } }).select('+content +normalizedSummary').sort({ createdAt: -1 }).lean<AiMemoryRecord[]>().exec(); }
  deleteOne(workspaceId: string, subjectId: string, recordId: string) { return this.records.deleteOne({ _id: new Types.ObjectId(recordId), workspaceId: new Types.ObjectId(workspaceId), subjectId: new Types.ObjectId(subjectId) }); }
  deleteForSubject(workspaceId: string, subjectId: string) { return this.records.deleteMany({ workspaceId: new Types.ObjectId(workspaceId), subjectId: new Types.ObjectId(subjectId) }); }
  expire(now = new Date()) { return this.records.deleteMany({ retentionExpiry: { $lte: now } }); }
}
