import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { Types } from 'mongoose';

@Injectable()
export class AiReliabilityMetricsService {
  constructor(@InjectConnection() private readonly connection: Connection) {}
  async report(workspaceId: string, since: Date) {
    const rows = await this.connection.collection('ai_execution_traces').aggregate<{ total: number; success: number; timeout: number; fallback: number; moderationBlocks: number; toolFailures: number; retrievalFailures: number; avgTokens: number; avgCost: number; p50: number; p95: number; p99: number; queueDelay: number }>([
      { $match: { workspaceId: new Types.ObjectId(workspaceId), createdAt: { $gte: since } } },
      { $group: { _id: null, total: { $sum: 1 }, success: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }, timeout: { $sum: { $cond: [{ $regexMatch: { input: { $ifNull: ['$errorCode', ''] }, regex: /timeout/iu } }, 1, 0] } }, fallback: { $sum: { $cond: ['$fallbackUsed', 1, 0] } }, moderationBlocks: { $sum: { $cond: [{ $eq: ['$errorCode', 'moderation_block'] }, 1, 0] } }, toolFailures: { $sum: { $cond: [{ $eq: ['$errorCode', 'tool_failure'] }, 1, 0] } }, retrievalFailures: { $sum: { $cond: [{ $eq: ['$errorCode', 'retrieval_failure'] }, 1, 0] } }, avgTokens: { $avg: { $add: ['$inputTokens', '$outputTokens'] } }, avgCost: { $avg: '$costUsd' }, queueDelay: { $avg: { $ifNull: ['$queueDelayMs', 0] } }, latencies: { $push: '$latencyMs' } } },
      { $project: { _id: 0, total: 1, success: 1, timeout: 1, fallback: 1, moderationBlocks: 1, toolFailures: 1, retrievalFailures: 1, avgTokens: 1, avgCost: 1, queueDelay: 1, p50: { $arrayElemAt: [{ $sortArray: { input: '$latencies', sortBy: 1 } }, { $floor: { $multiply: [{ $size: '$latencies' }, 0.5] } }] }, p95: { $arrayElemAt: [{ $sortArray: { input: '$latencies', sortBy: 1 } }, { $floor: { $multiply: [{ $size: '$latencies' }, 0.95] } }] }, p99: { $arrayElemAt: [{ $sortArray: { input: '$latencies', sortBy: 1 } }, { $floor: { $multiply: [{ $size: '$latencies' }, 0.99] } }] } } },
    ]).toArray();
    const row = rows[0] ?? { total: 0, success: 0, timeout: 0, fallback: 0, moderationBlocks: 0, toolFailures: 0, retrievalFailures: 0, avgTokens: 0, avgCost: 0, p50: 0, p95: 0, p99: 0, queueDelay: 0 };
    const rate = (value: number) => row.total ? value / row.total : 0;
    return { requestCount: row.total, successRate: rate(row.success), timeoutRate: rate(row.timeout), fallbackRate: rate(row.fallback), moderationBlockRate: rate(row.moderationBlocks), toolFailureRate: rate(row.toolFailures), retrievalFailureRate: rate(row.retrievalFailures), averageTokens: row.avgTokens, averageCostUsd: row.avgCost, latencyMs: { p50: row.p50, p95: row.p95, p99: row.p99 }, averageQueueDelayMs: row.queueDelay };
  }
}
