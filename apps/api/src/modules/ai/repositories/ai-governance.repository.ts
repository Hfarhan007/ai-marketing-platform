import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { createHash } from 'node:crypto';
import type { Connection, Model } from 'mongoose';
import { Types } from 'mongoose';
import { AiEvaluationRun, AiFeedback, AiGoldenCase, AiIncident, AiSafetyIntervention, AiSafetyPolicy } from '../schemas/ai-governance.schemas.js';
@Injectable()
export class AiGovernanceRepository {
  constructor(@InjectModel(AiSafetyPolicy.name) private readonly policies: Model<AiSafetyPolicy>, @InjectModel(AiFeedback.name) private readonly feedback: Model<AiFeedback>, @InjectModel(AiSafetyIntervention.name) private readonly interventions: Model<AiSafetyIntervention>, @InjectModel(AiIncident.name) private readonly incidents: Model<AiIncident>, @InjectModel(AiGoldenCase.name) private readonly cases: Model<AiGoldenCase>, @InjectModel(AiEvaluationRun.name) private readonly runs: Model<AiEvaluationRun>, @InjectConnection() private readonly connection: Connection) {}
  policy(workspaceId: string) { return this.policies.findOne({ workspaceId: new Types.ObjectId(workspaceId) }).lean<AiSafetyPolicy>().exec(); }
  intervention(value: Record<string, unknown>) { return new this.interventions(value).save(); }
  incident(value: Record<string, unknown>) { return new this.incidents(value).save(); }
  goldenCases(workspaceId: string) { return this.cases.find({ workspaceId: new Types.ObjectId(workspaceId) }).select('+input').lean<AiGoldenCase[]>().exec(); }
  evaluation(value: Record<string, unknown>) { return new this.runs(value).save(); }
  startTrace(value: Record<string, unknown>) { return this.connection.collection('ai_execution_traces').updateOne({ requestId: value.requestId }, { $setOnInsert: { ...value, status: 'running', createdAt: new Date(), updatedAt: new Date() } }, { upsert: true }); }
  finishTrace(requestId: string, value: Record<string, unknown>) { return this.connection.collection('ai_execution_traces').updateOne({ requestId }, { $set: { ...value, updatedAt: new Date() } }); }
  deletePrivateData(workspaceId: string, requestId: string) {
    const scope = { workspaceId: new Types.ObjectId(workspaceId), requestId };
    return Promise.all([this.connection.collection('ai_execution_traces').updateOne(scope, { $unset: { retainedPrompt: '' }, $set: { deleteAfter: new Date() } }), this.connection.collection('ai_feedback').updateMany(scope, { $unset: { comment: '' } })]);
  }
  submitFeedback(value: { workspaceId: string; requestId: string; userId: string; kind: string; comment?: string }) {
    return this.feedback.findOneAndUpdate({ workspaceId: new Types.ObjectId(value.workspaceId), requestId: value.requestId, userId: new Types.ObjectId(value.userId), kind: value.kind }, { $setOnInsert: { comment: value.comment ?? null, commentHash: value.comment ? createHash('sha256').update(value.comment).digest('hex') : null } }, { upsert: true, new: true }).lean().exec();
  }
  report(workspaceId: string, since: Date) {
    const scope = { workspaceId: new Types.ObjectId(workspaceId), createdAt: { $gte: since } };
    return Promise.all([
      this.connection.collection('ai_usage_records').aggregate([{ $match: scope }, { $group: { _id: null, cost: { $sum: '$costUsd' }, inputTokens: { $sum: '$inputTokens' }, outputTokens: { $sum: '$outputTokens' }, requests: { $sum: 1 } } }]).toArray(),
      this.connection.collection('ai_execution_traces').aggregate([{ $match: scope }, { $group: { _id: '$status', count: { $sum: 1 } } }]).toArray(),
      this.connection.collection('ai_safety_interventions').aggregate([{ $match: scope }, { $group: { _id: '$reason', count: { $sum: 1 } } }]).toArray(),
      this.connection.collection('ai_feedback').aggregate<{ _id: string; count: number }>([{ $match: { ...scope, kind: 'hallucination' } }, { $group: { _id: '$kind', count: { $sum: 1 } } }]).toArray(),
      this.connection.collection('ai_evaluation_runs').find(scope).sort({ createdAt: -1 }).limit(100).project({ scores: 1, provider: 1, model: 1, promptVersion: 1, passed: 1, createdAt: 1 }).toArray(),
    ]);
  }
}
