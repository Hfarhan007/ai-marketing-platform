import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import { AgentRun, AgentRunArtifact, AgentRunStep } from '../schemas/agent.schemas.js';
import type { AgentRunState, ClassifiedAgentError, RuntimeRun, RuntimeStore } from '../runtime/agent-runtime.types.js';

@Injectable()
export class MongooseRuntimeStore implements RuntimeStore {
  constructor(@InjectModel(AgentRun.name) private readonly runs: Model<AgentRun>, @InjectModel(AgentRunStep.name) private readonly steps: Model<AgentRunStep>, @InjectModel(AgentRunArtifact.name) private readonly artifacts: Model<AgentRunArtifact>) {}

  async getRun(runId: string) {
    const run = await this.runs.findById(runId).lean<AgentRun>().exec();
    if (!run) throw new NotFoundException('Agent run not found');
    return this.map(run);
  }

  async transition(runId: string, from: AgentRunState[], to: AgentRunState, reason?: string) {
    const run = await this.runs.findOneAndUpdate({ _id: new Types.ObjectId(runId), status: { $in: from } }, { $set: { status: to, stopReason: reason ?? null, heartbeatAt: new Date() } }, { new: true }).lean<AgentRun>().exec();
    if (run) return this.map(run);
    return this.getRun(runId);
  }

  async heartbeat(runId: string) { await this.runs.updateOne({ _id: new Types.ObjectId(runId) }, { $set: { heartbeatAt: new Date() } }); }

  async beginStep(runId: string, key: string, kind: string, input?: unknown) {
    const run = await this.runs.findById(runId).lean<AgentRun>().orFail();
    const existing = await this.steps.findOne({ runId: run._id, key }).lean<AgentRunStep>().exec();
    if (existing) return { step: { key, kind: existing.kind, status: existing.status as 'started' | 'completed' | 'failed', output: existing.output }, duplicate: true };
    try {
      const sequence = await this.steps.countDocuments({ runId: run._id });
      const step = await new this.steps({ workspaceId: run.workspaceId, runId: run._id, key, kind, sequence, input }).save();
      await this.runs.updateOne({ _id: run._id }, { $inc: { iteration: 1 } });
      return { step: { key, kind, status: step.status as 'started' }, duplicate: false };
    } catch (error) {
      if (!(error && typeof error === 'object' && 'code' in error && error.code === 11_000)) throw error;
      const step = await this.steps.findOne({ runId: run._id, key }).lean<AgentRunStep>().orFail();
      return { step: { key, kind: step.kind, status: step.status as 'started' | 'completed' | 'failed', output: step.output }, duplicate: true };
    }
  }

  async completeStep(runId: string, key: string, output?: unknown) { await this.steps.updateOne({ runId: new Types.ObjectId(runId), key, status: 'started' }, { $set: { status: 'completed', output } }); }
  async failStep(runId: string, key: string, error: ClassifiedAgentError) { await this.steps.updateOne({ runId: new Types.ObjectId(runId), key }, { $set: { status: 'failed', errorCode: error.code } }); }
  async recordError(runId: string, key: string, error: ClassifiedAgentError) {
    const run = await this.runs.findById(runId).lean<AgentRun>().orFail();
    await this.artifacts.updateOne({ runId: run._id, kind: 'error', key }, { $setOnInsert: { workspaceId: run.workspaceId, runId: run._id, kind: 'error', key, value: { name: error.name, message: error.message, code: error.code, classification: error.classification } } }, { upsert: true });
  }
  async requestCancellation(runId: string) { await this.runs.updateOne({ _id: new Types.ObjectId(runId) }, { $set: { cancellationRequested: true } }); }

  private map(run: AgentRun): RuntimeRun {
    return { id: String(run._id), workspaceId: String(run.workspaceId), state: run.status as AgentRunState, stepCount: run.iteration, toolCallCount: run.toolCallCount, inputTokens: run.inputTokens, outputTokens: run.outputTokens, costUsd: run.costUsd, cancellationRequested: run.cancellationRequested, limits: { maxSteps: run.maxSteps, maxToolCalls: run.maxToolCalls, maxTokens: run.maxTokens, maxCostUsd: run.maxCostUsd, deadline: run.deadline } };
  }
}
