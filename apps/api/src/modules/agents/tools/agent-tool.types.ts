import type { Permission } from '../../permissions/constants/permission.catalog.js';
import type { z } from 'zod';

export const TOOL_RISK_LEVELS = ['read-only', 'low-risk write', 'sensitive write', 'external side effect', 'irreversible'] as const;
export type ToolRiskLevel = (typeof TOOL_RISK_LEVELS)[number];
export type AgentType = 'sales' | 'support' | 'marketing' | 'scheduling' | 'general';

export interface AgentToolContext {
  workspaceId: string;
  userId: string;
  runId: string;
  agentType?: AgentType;
  toolDepth?: number;
  permissions: readonly Permission[];
  signal: AbortSignal;
}

export interface AgentToolDefinition<TInput extends z.ZodType = z.ZodType, TOutput extends z.ZodType = z.ZodType> {
  name: string;
  version: string;
  description: string;
  inputSchema: TInput;
  outputSchema: TOutput;
  requiredPermissions: readonly Permission[];
  allowedAgentTypes: readonly AgentType[];
  risk: ToolRiskLevel;
  idempotency: 'none' | 'generated';
  approval: 'never' | 'always' | 'risk_based';
  timeoutMs: number;
  rateLimit: { limit: number; windowMs: number };
  audit: { arguments: boolean; result: boolean; redact: readonly string[] };
  allowedUrlOrigins?: readonly string[];
  simulate?(input: z.infer<TInput>, context: AgentToolContext): Promise<z.infer<TOutput>>;
  execute(input: z.infer<TInput>, context: AgentToolContext): Promise<z.infer<TOutput>>;
  /** @deprecated compatibility aliases */
  schema?: TInput;
  permission?: Permission;
  sensitive?: boolean;
}

export function requiresApproval(tool: AgentToolDefinition) {
  return tool.approval === 'always' || (tool.approval === 'risk_based' && ['sensitive write', 'external side effect', 'irreversible'].includes(tool.risk));
}
