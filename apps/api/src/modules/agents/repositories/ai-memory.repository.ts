import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import { AiMemoryRecord } from '../ai-memory.schema.js';

@Injectable()
export class AiMemoryRepository {
  constructor(@InjectModel(AiMemoryRecord.name) private readonly records: Model<AiMemoryRecord>) {}

  remember(input: {
    workspaceId: string;
    subjectId: string;
    key: string;
    value: unknown;
    region: string;
    policyVersionId: string;
  }) {
    return this.records
      .findOneAndUpdate(
        {
          workspaceId: new Types.ObjectId(input.workspaceId),
          subjectId: new Types.ObjectId(input.subjectId),
          key: input.key,
        },
        {
          $set: {
            value: input.value,
            region: input.region,
            consentPolicyVersionId: new Types.ObjectId(input.policyVersionId),
          },
        },
        { upsert: true, new: true },
      )
      .lean<AiMemoryRecord>()
      .exec();
  }

  recall(workspaceId: string, subjectId: string) {
    return this.records
      .find({
        workspaceId: new Types.ObjectId(workspaceId),
        subjectId: new Types.ObjectId(subjectId),
      })
      .lean<AiMemoryRecord[]>()
      .exec();
  }
}
