import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';

@Schema({ collection: 'agents', timestamps: true, versionKey: 'version' })
export class Agent {
  _id!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: String, required: true }) name!: string;
  @Prop({ type: String, enum: ['draft', 'active', 'disabled'], default: 'draft' }) status!: string;
  @Prop({ type: Number, default: 0 }) activeVersion!: number;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) createdBy!: Types.ObjectId;
}
export const AgentSchema = SchemaFactory.createForClass(Agent);
AgentSchema.index({ workspaceId: 1, name: 1 }, { unique: true });

@Schema({ collection: 'agent_versions', timestamps: true, versionKey: false })
export class AgentVersion {
  _id!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) agentId!: Types.ObjectId;
  @Prop({ type: Number, required: true }) version!: number;
  @Prop({ type: String, required: true, select: false }) instructions!: string;
  @Prop({ type: String, default: 'en' }) language!: string;
  @Prop({ type: String, default: 'professional' }) tone!: string;
  @Prop({ type: String, required: true }) provider!: string;
  @Prop({ type: String, required: true }) model!: string;
  @Prop({ type: Number, min: 0, max: 2, default: 0.2 }) temperature!: number;
  @Prop({ type: MongooseSchema.Types.Mixed, required: true }) tokenLimits!: { input: number; output: number };
  @Prop({ type: [String], default: [] }) channels!: string[];
  @Prop({ type: [String], default: [] }) permittedTools!: string[];
  @Prop({ type: [String], default: [] }) knowledgeCollections!: string[];
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} }) businessHours!: Record<string, unknown>;
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} }) escalationRules!: Record<string, unknown>;
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} }) fallbackBehavior!: Record<string, unknown>;
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} }) safetyPolicy!: Record<string, unknown>;
  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  usageLimits!: { maxToolCalls: number; maxIterations: number; maxCostUsd: number; maxDurationMs: number };
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  memoryPolicy!: { shortTermMessages?: number; longTermEnabled?: boolean; ttlDays?: number };
}
export const AgentVersionSchema = SchemaFactory.createForClass(AgentVersion);
AgentVersionSchema.index({ workspaceId: 1, agentId: 1, version: 1 }, { unique: true });

@Schema({ collection: 'agent_runs', timestamps: true, versionKey: false })
export class AgentRun {
  _id!: Types.ObjectId;
  createdAt!: Date;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) agentId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) agentVersionId!: Types.ObjectId;
  @Prop({ type: String, required: true, unique: true }) requestId!: string;
  @Prop({ type: String, required: true }) correlationId!: string;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) userId!: Types.ObjectId;
  @Prop({ type: String, enum: ['queued', 'planning', 'retrieving', 'awaiting_tool', 'executing_tool', 'awaiting_approval', 'responding', 'completed', 'failed', 'cancelled', 'timed_out'], default: 'queued' }) status!: string;
  @Prop({ type: Number, default: 0 }) iteration!: number;
  @Prop({ type: Number, default: 0 }) toolCallCount!: number;
  @Prop({ type: Number, default: 0 }) costUsd!: number;
  @Prop({ type: Number, default: 0 }) inputTokens!: number;
  @Prop({ type: Number, default: 0 }) outputTokens!: number;
  @Prop({ type: Number, required: true, default: 25 }) maxSteps!: number;
  @Prop({ type: Number, required: true, default: 10 }) maxToolCalls!: number;
  @Prop({ type: Number, required: true, default: 100000 }) maxTokens!: number;
  @Prop({ type: Number, required: true, default: 10 }) maxCostUsd!: number;
  @Prop({ type: Boolean, default: false }) cancellationRequested!: boolean;
  @Prop({ type: Date, default: null }) heartbeatAt!: Date | null;
  @Prop({ type: Date, required: true }) deadline!: Date;
  @Prop({ type: String, default: null }) stopReason!: string | null;
}
export const AgentRunSchema = SchemaFactory.createForClass(AgentRun);
AgentRunSchema.index({ workspaceId: 1, agentId: 1, createdAt: -1 });
AgentRunSchema.index({ status: 1, heartbeatAt: 1 });

@Schema({ collection: 'agent_run_steps', timestamps: true, versionKey: false })
export class AgentRunStep {
  _id!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) runId!: Types.ObjectId;
  @Prop({ type: String, required: true }) key!: string;
  @Prop({ type: Number, required: true }) sequence!: number;
  @Prop({ type: String, required: true }) kind!: string;
  @Prop({ type: String, enum: ['started', 'completed', 'failed'], default: 'started' }) status!: string;
  @Prop({ type: MongooseSchema.Types.Mixed, default: null }) input!: unknown;
  @Prop({ type: MongooseSchema.Types.Mixed, default: null }) output!: unknown;
  @Prop({ type: String, default: null }) errorCode!: string | null;
}
export const AgentRunStepSchema = SchemaFactory.createForClass(AgentRunStep);
AgentRunStepSchema.index({ runId: 1, key: 1 }, { unique: true });

@Schema({ collection: 'agent_model_calls', timestamps: true, versionKey: false })
export class AgentModelCall {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) runId!: Types.ObjectId;
  @Prop({ type: String, required: true }) stepKey!: string;
  @Prop({ type: String, required: true }) provider!: string;
  @Prop({ type: String, required: true }) model!: string;
  @Prop({ type: MongooseSchema.Types.Mixed, required: true, select: false }) response!: unknown;
  @Prop({ type: Number, default: 0 }) inputTokens!: number;
  @Prop({ type: Number, default: 0 }) outputTokens!: number;
  @Prop({ type: Number, default: 0 }) costUsd!: number;
}
export const AgentModelCallSchema = SchemaFactory.createForClass(AgentModelCall);
AgentModelCallSchema.index({ runId: 1, stepKey: 1 }, { unique: true });

@Schema({ collection: 'agent_approvals', timestamps: true, versionKey: false })
export class AgentApproval {
  _id!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) runId!: Types.ObjectId;
  @Prop({ type: String, required: true }) stepKey!: string;
  @Prop({ type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }) status!: string;
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} }) request!: unknown;
  @Prop({ type: MongooseSchema.Types.ObjectId, default: null }) decidedBy!: Types.ObjectId | null;
  @Prop({ type: Date, default: null }) decidedAt!: Date | null;
}
export const AgentApprovalSchema = SchemaFactory.createForClass(AgentApproval);
AgentApprovalSchema.index({ runId: 1, stepKey: 1 }, { unique: true });

@Schema({ collection: 'agent_run_artifacts', timestamps: true, versionKey: false })
export class AgentRunArtifact {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) runId!: Types.ObjectId;
  @Prop({ type: String, enum: ['retrieved_source', 'safety_decision', 'error'], required: true }) kind!: string;
  @Prop({ type: String, required: true }) key!: string;
  @Prop({ type: MongooseSchema.Types.Mixed, required: true }) value!: unknown;
}
export const AgentRunArtifactSchema = SchemaFactory.createForClass(AgentRunArtifact);
AgentRunArtifactSchema.index({ runId: 1, kind: 1, key: 1 }, { unique: true });

@Schema({ collection: 'agent_orchestration_runs', timestamps: true, versionKey: false })
export class AgentOrchestrationRun {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: String, required: true }) workflow!: string;
  @Prop({ type: String, required: true }) status!: string;
  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] }) results!: unknown[];
  @Prop({ type: Number, required: true }) totalTokens!: number;
  @Prop({ type: Number, required: true }) totalCostUsd!: number;
  @Prop({ type: Number, required: true }) latencyMs!: number;
}
export const AgentOrchestrationRunSchema = SchemaFactory.createForClass(AgentOrchestrationRun);
AgentOrchestrationRunSchema.index({ workspaceId: 1, createdAt: -1 });

@Schema({ collection: 'agent_messages', timestamps: true, versionKey: false })
export class AgentMessage {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) runId!: Types.ObjectId;
  @Prop({ type: String, enum: ['system', 'user', 'assistant', 'tool'], required: true }) role!: string;
  @Prop({ type: String, required: true, select: false }) content!: string;
  @Prop({ type: String, required: true }) contentHash!: string;
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} }) metadata!: Record<string, unknown>;
}
export const AgentMessageSchema = SchemaFactory.createForClass(AgentMessage);
AgentMessageSchema.index({ workspaceId: 1, runId: 1, createdAt: 1 });

@Schema({ collection: 'agent_memory_records', timestamps: true, versionKey: false })
export class AgentMemoryRecord {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) agentId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) subjectId!: Types.ObjectId;
  @Prop({ type: String, required: true }) key!: string;
  @Prop({ type: MongooseSchema.Types.Mixed, required: true, select: false }) value!: unknown;
  @Prop({ type: Date, required: true }) expiresAt!: Date;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) consentPolicyVersionId!: Types.ObjectId;
}
export const AgentMemoryRecordSchema = SchemaFactory.createForClass(AgentMemoryRecord);
AgentMemoryRecordSchema.index({ workspaceId: 1, agentId: 1, subjectId: 1, key: 1 }, { unique: true });
// No TTL: expiration must re-evaluate consent and legal holds.

@Schema({ collection: 'agent_tool_executions', timestamps: true, versionKey: false })
export class ToolExecution {
  _id!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) runId!: Types.ObjectId;
  @Prop({ type: String, required: true }) toolName!: string;
  @Prop({ type: String, required: true, default: '1.0.0' }) toolVersion!: string;
  @Prop({ type: String, required: true, default: 'read-only' }) risk!: string;
  @Prop({ type: String, required: true }) idempotencyKey!: string;
  @Prop({ type: String, enum: ['pending_approval', 'running', 'completed', 'failed', 'rejected'], required: true }) status!: string;
  @Prop({ type: MongooseSchema.Types.Mixed, default: null }) result!: unknown;
  @Prop({ type: MongooseSchema.Types.Mixed, default: null, select: false }) requestedArguments!: unknown;
  @Prop({ type: MongooseSchema.Types.Mixed, default: null, select: false }) approvedArguments!: unknown;
  @Prop({ type: Boolean, default: false }) simulation!: boolean;
  @Prop({ type: String, default: null }) error!: string | null;
  @Prop({ type: MongooseSchema.Types.ObjectId, default: null }) approvedBy!: Types.ObjectId | null;
  @Prop({ type: MongooseSchema.Types.ObjectId, default: null }) approvalId!: Types.ObjectId | null;
}
export const ToolExecutionSchema = SchemaFactory.createForClass(ToolExecution);
ToolExecutionSchema.index({ workspaceId: 1, idempotencyKey: 1 }, { unique: true });

@Schema({ collection: 'agent_usage', timestamps: true, versionKey: false })
export class AgentUsage {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) runId!: Types.ObjectId;
  @Prop({ type: Number, required: true }) inputTokens!: number;
  @Prop({ type: Number, required: true }) outputTokens!: number;
  @Prop({ type: Number, required: true }) costUsd!: number;
  @Prop({ type: String, required: true }) provider!: string;
  @Prop({ type: String, required: true }) model!: string;
}
export const AgentUsageSchema = SchemaFactory.createForClass(AgentUsage);
AgentUsageSchema.index({ workspaceId: 1, runId: 1 });

@Schema({ collection: 'agent_evaluations', timestamps: true, versionKey: false })
export class AgentEvaluation {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) runId!: Types.ObjectId;
  @Prop({ type: String, required: true }) evaluator!: string;
  @Prop({ type: Number, min: 0, max: 1, required: true }) score!: number;
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} }) dimensions!: Record<string, number>;
  @Prop({ type: String, default: null, select: false }) notes!: string | null;
}
export const AgentEvaluationSchema = SchemaFactory.createForClass(AgentEvaluation);
AgentEvaluationSchema.index({ workspaceId: 1, runId: 1, createdAt: -1 });
