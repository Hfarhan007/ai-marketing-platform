import type { Permission } from '../../permissions/constants/permission.catalog.js';
import type { z } from 'zod';

export interface AgentToolContext {
  workspaceId: string;
  userId: string;
  runId: string;
  permissions: readonly Permission[];
  signal: AbortSignal;
}
export interface AgentToolDefinition<TSchema extends z.ZodType = z.ZodType> {
  name: string;
  description: string;
  schema: TSchema;
  permission: Permission;
  sensitive: boolean;
  timeoutMs: number;
  execute(input: z.infer<TSchema>, context: AgentToolContext): Promise<unknown>;
}
