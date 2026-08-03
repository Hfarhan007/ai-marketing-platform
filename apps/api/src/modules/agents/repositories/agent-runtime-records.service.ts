import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import { AgentApproval, AgentModelCall, AgentRun, AgentRunArtifact } from '../schemas/agent.schemas.js';

@Injectable()
export class AgentRuntimeRecordsService {
  constructor(@InjectModel(AgentModelCall.name) private readonly calls: Model<AgentModelCall>, @InjectModel(AgentRun.name) private readonly runs: Model<AgentRun>, @InjectModel(AgentApproval.name) private readonly approvals: Model<AgentApproval>, @InjectModel(AgentRunArtifact.name) private readonly artifacts: Model<AgentRunArtifact>) {}

  async recordModelCall(input: { workspaceId: string; runId: string; stepKey: string; provider: string; model: string; response: unknown; inputTokens: number; outputTokens: number; costUsd: number }) {
    const runId = new Types.ObjectId(input.runId);
    try {
      const call = await new this.calls({ ...input, workspaceId: new Types.ObjectId(input.workspaceId), runId }).save();
      await this.runs.updateOne({ _id: runId }, { $inc: { inputTokens: input.inputTokens, outputTokens: input.outputTokens, costUsd: input.costUsd } });
      return call.toObject();
    } catch (error) {
      if (!(error && typeof error === 'object' && 'code' in error && error.code === 11_000)) throw error;
      return this.calls.findOne({ runId, stepKey: input.stepKey }).select('+response').lean().exec();
    }
  }
  requestApproval(input: { workspaceId: string; runId: string; stepKey: string; request: unknown }) {
    return this.approvals.findOneAndUpdate({ runId: new Types.ObjectId(input.runId), stepKey: input.stepKey }, { $setOnInsert: { workspaceId: new Types.ObjectId(input.workspaceId), runId: new Types.ObjectId(input.runId), stepKey: input.stepKey, request: input.request, status: 'pending' } }, { upsert: true, new: true }).lean().exec();
  }
  decideApproval(runId: string, stepKey: string, userId: string, approved: boolean) {
    return this.approvals.findOneAndUpdate({ runId: new Types.ObjectId(runId), stepKey, status: 'pending' }, { $set: { status: approved ? 'approved' : 'rejected', decidedBy: new Types.ObjectId(userId), decidedAt: new Date() } }, { new: true }).lean().exec();
  }
  recordArtifact(input: { workspaceId: string; runId: string; kind: 'retrieved_source' | 'safety_decision'; key: string; value: unknown }) {
    return this.artifacts.updateOne({ runId: new Types.ObjectId(input.runId), kind: input.kind, key: input.key }, { $setOnInsert: { ...input, workspaceId: new Types.ObjectId(input.workspaceId), runId: new Types.ObjectId(input.runId) } }, { upsert: true });
  }
}
