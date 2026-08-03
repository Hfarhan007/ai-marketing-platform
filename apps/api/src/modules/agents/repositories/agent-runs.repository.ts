import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createHash } from 'node:crypto';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import { Agent, AgentApproval, AgentMessage, AgentRun, AgentUsage, AgentVersion, ToolExecution } from '../schemas/agent.schemas.js';

@Injectable()
export class AgentRunsRepository {
  constructor(
    @InjectModel(Agent.name) private readonly agents: Model<Agent>,
    @InjectModel(AgentVersion.name) private readonly versions: Model<AgentVersion>,
    @InjectModel(AgentRun.name) private readonly runs: Model<AgentRun>,
    @InjectModel(AgentMessage.name) private readonly messages: Model<AgentMessage>,
    @InjectModel(ToolExecution.name) private readonly tools: Model<ToolExecution>,
    @InjectModel(AgentApproval.name) private readonly approvals: Model<AgentApproval>,
    @InjectModel(AgentUsage.name) private readonly usage: Model<AgentUsage>,
  ) {}
  async configuration(workspaceId: string, agentId: string) {
    const agent = await this.agents.findOne({ _id: new Types.ObjectId(agentId), workspaceId: new Types.ObjectId(workspaceId), status: 'active' }).lean<Agent>().exec();
    if (!agent) throw new NotFoundException('Agent not found');
    const version = await this.versions.findOne({ workspaceId: agent.workspaceId, agentId: agent._id, version: agent.activeVersion }).select('+instructions').lean<AgentVersion>().exec();
    if (!version) throw new NotFoundException('Active agent version not found');
    return { agent, version };
  }
  async createRun(input: { workspaceId: string; agentId: string; agentVersionId: string; requestId: string; correlationId: string; userId: string; deadline: Date; maxSteps: number; maxToolCalls: number; maxTokens: number; maxCostUsd: number }) {
    const existing = await this.runs.findOne({ requestId: input.requestId }).lean<AgentRun>().exec();
    if (existing) return { run: existing, duplicate: true };
    const run = await new this.runs({ ...input, workspaceId: new Types.ObjectId(input.workspaceId), agentId: new Types.ObjectId(input.agentId), agentVersionId: new Types.ObjectId(input.agentVersionId), userId: new Types.ObjectId(input.userId) }).save();
    return { run: run.toObject(), duplicate: false };
  }
  appendMessage(workspaceId: string, runId: string, role: string, content: string, metadata: Record<string, unknown> = {}) {
    return new this.messages({ workspaceId: new Types.ObjectId(workspaceId), runId: new Types.ObjectId(runId), role, content, contentHash: createHash('sha256').update(content).digest('hex'), metadata }).save();
  }
  messagesForRun(workspaceId: string, runId: string, limit: number) {
    return this.messages.find({ workspaceId: new Types.ObjectId(workspaceId), runId: new Types.ObjectId(runId) }).sort({ createdAt: -1 }).limit(limit).select('+content').lean<AgentMessage[]>().exec().then((values) => values.reverse());
  }
  updateRun(workspaceId: string, runId: string, update: Record<string, unknown>) {
    return this.runs.findOneAndUpdate({ _id: new Types.ObjectId(runId), workspaceId: new Types.ObjectId(workspaceId) }, update, { new: true }).lean<AgentRun>().exec();
  }
  async reserveTool(workspaceId: string, runId: string, toolName: string, idempotencyKey: string, sensitive: boolean, audit: { toolVersion: string; risk: string; requestedArguments: unknown; simulation: boolean }) {
    const existing = await this.tools.findOne({ workspaceId: new Types.ObjectId(workspaceId), idempotencyKey }).lean<ToolExecution>().exec();
    if (existing) return { execution: existing, duplicate: true };
    try {
      const execution = await new this.tools({ workspaceId: new Types.ObjectId(workspaceId), runId: new Types.ObjectId(runId), toolName, idempotencyKey, status: sensitive ? 'pending_approval' : 'running', ...audit }).save();
      if (sensitive) {
        const approval = await new this.approvals({ workspaceId: new Types.ObjectId(workspaceId), runId: new Types.ObjectId(runId), stepKey: `tool:${String(execution._id)}`, status: 'pending', request: { toolName, toolVersion: audit.toolVersion, risk: audit.risk, arguments: audit.requestedArguments } }).save();
        execution.approvalId = approval._id;
        await execution.save();
      }
      await this.runs.updateOne({ _id: new Types.ObjectId(runId), workspaceId: new Types.ObjectId(workspaceId) }, { $inc: { toolCallCount: 1 } });
      return { execution: execution.toObject(), duplicate: false };
    } catch (error) {
      if (!(error && typeof error === 'object' && 'code' in error && error.code === 11_000)) throw error;
      return { execution: await this.tools.findOne({ workspaceId: new Types.ObjectId(workspaceId), idempotencyKey }).lean<ToolExecution>().orFail(), duplicate: true };
    }
  }
  approveTool(workspaceId: string, executionId: string, approvalId: string, approvedArguments: unknown) {
    if (!Types.ObjectId.isValid(approvalId)) return Promise.resolve(null);
    return this.approvals.findOne({ _id: new Types.ObjectId(approvalId), workspaceId: new Types.ObjectId(workspaceId), stepKey: `tool:${executionId}`, status: 'approved' }).lean<AgentApproval>().exec().then((approval) => approval?.decidedBy ? this.tools.findOneAndUpdate({ _id: new Types.ObjectId(executionId), workspaceId: new Types.ObjectId(workspaceId), approvalId: approval._id, status: 'pending_approval' }, { $set: { status: 'running', approvedBy: approval.decidedBy, approvedArguments } }, { new: true }).lean().exec() : null);
  }
  completeTool(workspaceId: string, executionId: string, result: unknown) {
    return this.tools.updateOne({ _id: new Types.ObjectId(executionId), workspaceId: new Types.ObjectId(workspaceId), status: 'running' }, { $set: { status: 'completed', result } });
  }
  failTool(workspaceId: string, executionId: string, error: unknown) {
    return this.tools.updateOne({ _id: new Types.ObjectId(executionId), workspaceId: new Types.ObjectId(workspaceId) }, { $set: { status: 'failed', error: error instanceof Error ? error.message.slice(0, 1000) : String(error).slice(0, 1000) } });
  }
  recordUsage(value: Record<string, unknown>) { return new this.usage(value).save(); }
}
