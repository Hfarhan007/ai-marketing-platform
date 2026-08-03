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
  @Prop({ type: String, enum: ['running', 'completed', 'failed', 'blocked'], default: 'running' }) status!: string;
  @Prop({ type: String, default: null }) errorCode!: string | null;
  @Prop({ type: String, default: null, select: false }) retainedPrompt!: string | null;
  @Prop({ type: Date, default: null }) deleteAfter!: Date | null;
}
export const AiExecutionTraceSchema = SchemaFactory.createForClass(AiExecutionTrace);

@Schema({ collection: 'ai_feedback', timestamps: true, versionKey: false })
export class AiFeedback {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: String, required: true }) requestId!: string;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) userId!: Types.ObjectId;
  @Prop({ type: String, enum: ['positive', 'negative', 'hallucination', 'unsafe', 'bad_citation'], required: true }) kind!: string;
  @Prop({ type: String, default: null, select: false }) comment!: string | null;
  @Prop({ type: String, default: null }) commentHash!: string | null;
}
export const AiFeedbackSchema = SchemaFactory.createForClass(AiFeedback);
AiFeedbackSchema.index({ workspaceId: 1, requestId: 1, userId: 1, kind: 1 }, { unique: true });

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
