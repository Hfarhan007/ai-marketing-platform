import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import type { Connection, Model } from 'mongoose';
import { Types } from 'mongoose';
import { AiEvaluationRun, AiFeedback, AiFeedbackEvaluationCase, AiFeedbackRegressionAlert, AiGoldenCase, AiIncident, AiSafetyIntervention, AiSafetyPolicy } from '../schemas/ai-governance.schemas.js';
@Injectable()
export class AiGovernanceRepository {
  constructor(@InjectModel(AiSafetyPolicy.name) private readonly policies: Model<AiSafetyPolicy>, @InjectModel(AiFeedback.name) private readonly feedback: Model<AiFeedback>, @InjectModel(AiFeedbackEvaluationCase.name) private readonly feedbackCases: Model<AiFeedbackEvaluationCase>, @InjectModel(AiFeedbackRegressionAlert.name) private readonly feedbackAlerts: Model<AiFeedbackRegressionAlert>, @InjectModel(AiSafetyIntervention.name) private readonly interventions: Model<AiSafetyIntervention>, @InjectModel(AiIncident.name) private readonly incidents: Model<AiIncident>, @InjectModel(AiGoldenCase.name) private readonly cases: Model<AiGoldenCase>, @InjectModel(AiEvaluationRun.name) private readonly runs: Model<AiEvaluationRun>, @InjectConnection() private readonly connection: Connection) {}
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
  executionTrace(workspaceId: string, requestId: string) { return this.connection.collection('ai_execution_traces').findOne({ workspaceId: new Types.ObjectId(workspaceId), requestId }); }
  submitFeedback(value: Record<string, unknown> & { workspaceId: string; userId: string; deduplicationKey: string }) {
    return this.feedback.findOneAndUpdate({ workspaceId: new Types.ObjectId(value.workspaceId), deduplicationKey: value.deduplicationKey }, { $setOnInsert: { ...value, workspaceId: new Types.ObjectId(value.workspaceId), userId: new Types.ObjectId(value.userId) } }, { upsert: true, new: true }).lean<AiFeedback>().exec();
  }
  feedbackById(workspaceId: string, feedbackId: string, includePrivate = false) { const query = this.feedback.findOne({ _id: new Types.ObjectId(feedbackId), workspaceId: new Types.ObjectId(workspaceId) }); if (includePrivate) query.select('+comment +editedResponse +incorrectFact +inputSnapshot +outputSnapshot +adjudicationNotes'); return query.lean<AiFeedback>().exec(); }
  reviewerQueue(workspaceId: string, queue: string, status: string, limit = 50) { return this.feedback.find({ workspaceId: new Types.ObjectId(workspaceId), reviewerQueue: queue, status }).sort({ createdAt: 1 }).limit(Math.min(limit, 100)).lean<AiFeedback[]>().exec(); }
  claimFeedback(workspaceId: string, feedbackId: string, reviewerId: string) { return this.feedback.findOneAndUpdate({ _id: new Types.ObjectId(feedbackId), workspaceId: new Types.ObjectId(workspaceId), status: 'unresolved' }, { $set: { status: 'in_review', reviewerId: new Types.ObjectId(reviewerId) } }, { new: true }).lean<AiFeedback>().exec(); }
  adjudicateFeedback(workspaceId: string, feedbackId: string, reviewerId: string, decision: string, notes: string | null) { return this.feedback.findOneAndUpdate({ _id: new Types.ObjectId(feedbackId), workspaceId: new Types.ObjectId(workspaceId), status: { $in: ['unresolved', 'in_review'] } }, { $set: { status: decision === 'approved' ? 'resolved' : decision === 'rejected' ? 'rejected' : 'unresolved', adjudication: decision, adjudicationNotes: notes, reviewerId: new Types.ObjectId(reviewerId), resolvedAt: ['approved', 'rejected'].includes(decision) ? new Date() : null } }, { new: true }).select('+comment +editedResponse +incorrectFact +inputSnapshot +outputSnapshot').lean<AiFeedback>().exec(); }
  createFeedbackCase(value: Record<string, unknown> & { workspaceId: string; feedbackId: Types.ObjectId }) { return this.feedbackCases.findOneAndUpdate({ feedbackId: value.feedbackId }, { $setOnInsert: { ...value, workspaceId: new Types.ObjectId(value.workspaceId) } }, { upsert: true, new: true }).lean().exec(); }
  compareFeedback(workspaceId: string, since: Date) { return this.feedback.aggregate<{ provider: string | null; model: string | null; promptVersion: string | null; total: number; negative: number; unresolved: number }>([{ $match: { workspaceId: new Types.ObjectId(workspaceId), createdAt: { $gte: since } } }, { $group: { _id: { provider: '$provider', model: '$model', promptVersion: '$promptVersion' }, total: { $sum: 1 }, negative: { $sum: { $cond: [{ $eq: ['$kind', 'thumbs_down'] }, 1, 0] } }, unresolved: { $sum: { $cond: [{ $in: ['$status', ['unresolved', 'in_review']] }, 1, 0] } } } }, { $project: { _id: 0, provider: '$_id.provider', model: '$_id.model', promptVersion: '$_id.promptVersion', total: 1, negative: 1, unresolved: 1 } }]).exec(); }
  regressionAlert(value: { workspaceId: string; dimension: string; candidate: string; observedRate: number; threshold: number }) { return this.feedbackAlerts.findOneAndUpdate({ workspaceId: new Types.ObjectId(value.workspaceId), dimension: value.dimension, candidate: value.candidate, status: 'open' }, { $set: { observedRate: value.observedRate, threshold: value.threshold }, $setOnInsert: { workspaceId: new Types.ObjectId(value.workspaceId), dimension: value.dimension, candidate: value.candidate, status: 'open' } }, { upsert: true, new: true }).lean().exec(); }
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
