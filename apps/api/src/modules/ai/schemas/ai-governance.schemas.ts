import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';

@Schema({ collection: 'ai_safety_policies', timestamps: true, versionKey: false })
export class AiSafetyPolicy {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: [String], default: [] }) blockedTopics!: string[];
  @Prop({ type: Number, min: 1, max: 100_000, default: 20_000 }) maximumResponseCharacters!: number;
  @Prop({ type: Boolean, default: true }) redactPii!: boolean;
  @Prop({ type: Boolean, default: true }) escalateOnOutputBlock!: boolean;
  @Prop({ type: Number, min: 0, max: 365, default: 0 }) promptRetentionDays!: number;
  @Prop({ type: [String], default: [] }) allowedProviders!: string[];
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} }) featureQuotas!: Record<string, { tokens?: number; costUsd?: number }>;
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} }) featureRoutingPolicies!: Record<string, Record<string, unknown>>;
  @Prop({ type: Number, min: 0, default: 10 }) maximumExecutionCostUsd!: number;
}
export const AiSafetyPolicySchema = SchemaFactory.createForClass(AiSafetyPolicy);
AiSafetyPolicySchema.index({ workspaceId: 1 }, { unique: true });

@Schema({ collection: 'ai_execution_traces', timestamps: true, versionKey: false })
export class AiExecutionTrace {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: String, required: true, unique: true }) requestId!: string;
  @Prop({ type: String, required: true }) correlationId!: string;
  @Prop({ type: String, required: true }) feature!: string;
  @Prop({ type: String, default: null }) agentId!: string | null;
  @Prop({ type: String, default: null }) purpose!: string | null;
  @Prop({ type: String, default: null }) promptVersion!: string | null;
  @Prop({ type: [String], default: [] }) knowledgeScope!: string[];
  @Prop({ type: [String], default: [] }) permittedTools!: string[];
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} }) retentionPolicy!: Record<string, unknown>;
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} }) budget!: Record<string, unknown>;
  @Prop({ type: Date, default: null }) deadline!: Date | null;
  @Prop({ type: String, default: null }) provider!: string | null;
  @Prop({ type: String, default: null }) model!: string | null;
  @Prop({ type: Number, default: 0 }) latencyMs!: number;
  @Prop({ type: Number, default: 0 }) queueDelayMs!: number;
  @Prop({ type: Number, default: 0 }) inputTokens!: number;
  @Prop({ type: Number, default: 0 }) outputTokens!: number;
  @Prop({ type: Number, default: 0 }) costUsd!: number;
  @Prop({ type: Number, default: 0 }) retries!: number;
  @Prop({ type: Boolean, default: false }) fallbackUsed!: boolean;
  @Prop({ type: String, default: null }) selectionReason!: string | null;
  @Prop({ type: String, default: null }) fallbackReason!: string | null;
  @Prop({ type: Boolean, default: false }) cacheHit!: boolean;
  @Prop({ type: [String], default: [] }) retrievalSources!: string[];
  @Prop({ type: [String], default: [] }) toolCalls!: string[];
  @Prop({ type: [String], default: [] }) safetyInterventions!: string[];
  @Prop({ type: String, enum: ['running', 'completed', 'failed', 'blocked', 'cancelled', 'degraded'], default: 'running' }) status!: string;
  @Prop({ type: String, default: null }) errorCode!: string | null;
  @Prop({ type: String, default: null, select: false }) retainedPrompt!: string | null;
  @Prop({ type: Date, default: null }) deleteAfter!: Date | null;
}
export const AiExecutionTraceSchema = SchemaFactory.createForClass(AiExecutionTrace);

@Schema({ collection: 'ai_feedback', timestamps: true, versionKey: false })
export class AiFeedback {
  _id!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: String, required: true }) requestId!: string;
  @Prop({ type: String, required: true }) executionId!: string;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) userId!: Types.ObjectId;
  @Prop({ type: String, enum: ['thumbs_up', 'thumbs_down'], required: true }) kind!: string;
  @Prop({ type: [String], default: [] }) reasonCodes!: string[];
  @Prop({ type: String, default: null, select: false }) editedResponse!: string | null;
  @Prop({ type: String, default: null, select: false }) incorrectFact!: string | null;
  @Prop({ type: String, default: null, select: false }) comment!: string | null;
  @Prop({ type: String, default: null }) commentHash!: string | null;
  @Prop({ type: String, required: true }) deduplicationKey!: string;
  @Prop({ type: String, default: null }) promptVersion!: string | null;
  @Prop({ type: String, default: null }) provider!: string | null;
  @Prop({ type: String, default: null }) model!: string | null;
  @Prop({ type: [String], default: [] }) retrievedSources!: string[];
  @Prop({ type: [String], default: [] }) toolCalls!: string[];
  @Prop({ type: [String], default: [] }) safetyDecisions!: string[];
  @Prop({ type: [String], default: [] }) userRoles!: string[];
  @Prop({ type: String, default: null, select: false }) inputSnapshot!: string | null;
  @Prop({ type: String, default: null, select: false }) outputSnapshot!: string | null;
  @Prop({ type: Boolean, default: false }) rawSnapshotPolicyPermitted!: boolean;
  @Prop({ type: String, enum: ['quality', 'factuality', 'safety', 'tooling', 'escalation'], required: true }) reviewerQueue!: string;
  @Prop({ type: String, enum: ['unresolved', 'in_review', 'resolved', 'rejected'], default: 'unresolved' }) status!: string;
  @Prop({ type: MongooseSchema.Types.ObjectId, default: null }) reviewerId!: Types.ObjectId | null;
  @Prop({ type: String, enum: ['approved', 'rejected', 'needs_more_information', null], default: null }) adjudication!: string | null;
  @Prop({ type: String, default: null, select: false }) adjudicationNotes!: string | null;
  @Prop({ type: Date, default: null }) resolvedAt!: Date | null;
}
export const AiFeedbackSchema = SchemaFactory.createForClass(AiFeedback);
AiFeedbackSchema.index({ workspaceId: 1, deduplicationKey: 1 }, { unique: true });
AiFeedbackSchema.index({ workspaceId: 1, reviewerQueue: 1, status: 1, createdAt: 1 });

@Schema({ collection: 'ai_feedback_evaluation_dataset', timestamps: true, versionKey: false })
export class AiFeedbackEvaluationCase {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, unique: true }) feedbackId!: Types.ObjectId;
  @Prop({ type: String, required: true, select: false }) input!: string;
  @Prop({ type: String, required: true, select: false }) expectedOutput!: string;
  @Prop({ type: [String], default: [] }) expectedSourceIds!: string[];
  @Prop({ type: [String], default: [] }) expectedTools!: string[];
  @Prop({ type: String, default: null }) promptVersion!: string | null;
  @Prop({ type: String, default: null }) provider!: string | null;
  @Prop({ type: String, default: null }) model!: string | null;
  @Prop({ type: String, enum: ['approved_feedback'], default: 'approved_feedback' }) origin!: string;
}
export const AiFeedbackEvaluationCaseSchema = SchemaFactory.createForClass(AiFeedbackEvaluationCase);

@Schema({ collection: 'ai_feedback_regression_alerts', timestamps: true, versionKey: false })
export class AiFeedbackRegressionAlert {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: String, required: true }) dimension!: string;
  @Prop({ type: String, required: true }) candidate!: string;
  @Prop({ type: Number, required: true }) observedRate!: number;
  @Prop({ type: Number, required: true }) threshold!: number;
  @Prop({ type: String, enum: ['open', 'acknowledged', 'resolved'], default: 'open' }) status!: string;
}
export const AiFeedbackRegressionAlertSchema = SchemaFactory.createForClass(AiFeedbackRegressionAlert);

@Schema({ collection: 'ai_safety_interventions', timestamps: true, versionKey: false })
export class AiSafetyIntervention {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: String, required: true }) requestId!: string;
  @Prop({ type: String, required: true }) stage!: string;
  @Prop({ type: String, required: true }) reason!: string;
  @Prop({ type: String, required: true }) contentHash!: string;
  @Prop({ type: Boolean, default: false }) escalated!: boolean;
}
export const AiSafetyInterventionSchema = SchemaFactory.createForClass(AiSafetyIntervention);

@Schema({ collection: 'ai_incidents', timestamps: true, versionKey: false })
export class AiIncident {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: String, required: true }) requestId!: string;
  @Prop({ type: String, enum: ['open', 'investigating', 'resolved'], default: 'open' }) status!: string;
  @Prop({ type: String, enum: ['low', 'medium', 'high', 'critical'], required: true }) severity!: string;
  @Prop({ type: String, required: true }) category!: string;
  @Prop({ type: String, required: true }) summary!: string;
}
export const AiIncidentSchema = SchemaFactory.createForClass(AiIncident);

@Schema({ collection: 'ai_golden_cases', timestamps: true, versionKey: false })
export class AiGoldenCase {
  _id!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: String, required: true }) name!: string;
  @Prop({ type: String, required: true, select: false }) input!: string;
  @Prop({ type: MongooseSchema.Types.Mixed, required: true }) expectations!: Record<string, unknown>;
  @Prop({ type: [String], default: [] }) tags!: string[];
}
export const AiGoldenCaseSchema = SchemaFactory.createForClass(AiGoldenCase);

@Schema({ collection: 'ai_evaluation_runs', timestamps: true, versionKey: false })
export class AiEvaluationRun {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: String, required: true }) suite!: string;
  @Prop({ type: String, required: true }) provider!: string;
  @Prop({ type: String, required: true }) model!: string;
  @Prop({ type: String, required: true }) promptVersion!: string;
  @Prop({ type: MongooseSchema.Types.Mixed, required: true }) scores!: Record<string, number>;
  @Prop({ type: Boolean, required: true }) passed!: boolean;
  @Prop({ type: String, default: null }) baselineRunId!: string | null;
}
export const AiEvaluationRunSchema = SchemaFactory.createForClass(AiEvaluationRun);
