import type { AiCapability, AiMessage, AiProviderName, AiResponse, AiTool } from '../providers/ai-provider.interface.js';
export interface AiExecutionBudget { maxCostUsd: number; maxInputTokens?: number; maxOutputTokens: number }
export interface AiRetentionPolicy { retainPrompt: boolean; days: number }
export interface AiRequestCommand {
  requestId?: string;
  correlationId: string;
  workspaceId: string;
  userId: string;
  agentId?: string;
  feature: string;
  purpose: string;
  messages?: AiMessage[];
  promptKey?: string;
  promptVariables?: Record<string, string | number | boolean>;
  environment?: 'development' | 'staging' | 'production';
  promptVersion?: string;
  knowledgeScope?: string[];
  permittedTools?: string[];
  tools?: AiTool[];
  dataClassification: 'public' | 'internal' | 'confidential' | 'restricted';
  retentionPolicy: AiRetentionPolicy;
  budget: AiExecutionBudget;
  deadline: Date;
  capabilities?: AiCapability[];
  preferredModel?: string;
  allowedProviders?: AiProviderName[];
  temperature?: number;
  jsonSchema?: Record<string, unknown>;
  cacheable?: boolean;
  routingPolicy?: { minimumContextTokens?: number; minimumOutputTokens?: number; latencyClass?: 'realtime' | 'standard' | 'batch'; qualityClass?: 'economy' | 'balanced' | 'premium'; residency?: string; privacy?: 'local' | 'zero_retention' | 'standard'; language?: string; timeoutMs?: number; retries?: number; hedgedSafe?: boolean; hedgeDelayMs?: number };
  signal?: AbortSignal;
}
export interface AiExecutionContext {
  requestId: string;
  correlationId: string;
  workspaceId: string;
  userId: string;
  agentId: string | null;
  feature: string;
  purpose: string;
  provider: AiProviderName | null;
  model: string | null;
  promptVersion: string | null;
  knowledgeScope: string[];
  permittedTools: string[];
  dataClassification: AiRequestCommand['dataClassification'];
  retentionPolicy: AiRetentionPolicy;
  budget: AiExecutionBudget;
  deadline: Date;
}
export interface AiExecutionResult { context: AiExecutionContext; response: AiResponse }
