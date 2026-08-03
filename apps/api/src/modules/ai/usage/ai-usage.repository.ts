import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { Types } from 'mongoose';
@Injectable()
export class AiUsageRepository {
  constructor(@InjectConnection() private readonly c: Connection) {}
  async used(workspaceId: string, since: Date) {
    const rows = await this.c
      .collection('ai_usage_records')
      .aggregate<{ tokens: number; cost: number }>([
        { $match: { workspaceId: new Types.ObjectId(workspaceId), createdAt: { $gte: since } } },
        {
          $group: {
            _id: null,
            tokens: { $sum: { $add: ['$inputTokens', '$outputTokens'] } },
            cost: { $sum: '$costUsd' },
          },
        },
      ])
      .toArray();
    return rows[0] ?? { tokens: 0, cost: 0 };
  }
  async usedFeature(workspaceId: string, feature: string, since: Date) {
    const rows = await this.c.collection('ai_usage_records').aggregate<{ tokens: number; cost: number }>([
      { $match: { workspaceId: new Types.ObjectId(workspaceId), feature, createdAt: { $gte: since } } },
      { $group: { _id: null, tokens: { $sum: { $add: ['$inputTokens', '$outputTokens'] } }, cost: { $sum: '$costUsd' } } },
    ]).toArray();
    return rows[0] ?? { tokens: 0, cost: 0 };
  }
  record(value: Record<string, unknown>) {
    return this.c
      .collection('ai_usage_records')
      .updateOne(
        { requestId: value.requestId },
        { $setOnInsert: { ...value, createdAt: new Date() } },
        { upsert: true },
      );
  }
}
