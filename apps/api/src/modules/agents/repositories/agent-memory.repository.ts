import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import { AgentMemoryRecord } from '../schemas/agent.schemas.js';

@Injectable()
export class AgentMemoryRepository {
  constructor(@InjectModel(AgentMemoryRecord.name) private readonly records: Model<AgentMemoryRecord>) {}

  remember(input: { workspaceId: string; agentId: string; subjectId: string; key: string; value: unknown; expiresAt: Date; policyVersionId: string }) {
    return this.records.findOneAndUpdate(
      { workspaceId: new Types.ObjectId(input.workspaceId), agentId: new Types.ObjectId(input.agentId), subjectId: new Types.ObjectId(input.subjectId), key: input.key },
      { $set: { value: input.value, expiresAt: input.expiresAt, consentPolicyVersionId: new Types.ObjectId(input.policyVersionId) } },
      { upsert: true, new: true },
    ).lean().exec();
  }

  recall(workspaceId: string, agentId: string, subjectId: string, limit = 50) {
    return this.records.find({
      workspaceId: new Types.ObjectId(workspaceId),
      agentId: new Types.ObjectId(agentId),
      subjectId: new Types.ObjectId(subjectId),
      expiresAt: { $gt: new Date() },
    }).select('+value').sort({ updatedAt: -1 }).limit(Math.min(limit, 50)).lean<AgentMemoryRecord[]>().exec();
  }

  expire(workspaceId: string, recordId: string) {
    return this.records.deleteOne({ _id: new Types.ObjectId(recordId), workspaceId: new Types.ObjectId(workspaceId) });
  }
}
