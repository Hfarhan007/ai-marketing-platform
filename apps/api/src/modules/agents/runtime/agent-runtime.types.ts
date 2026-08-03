export const AGENT_RUN_STATES = ['queued', 'planning', 'retrieving', 'awaiting_tool', 'executing_tool', 'awaiting_approval', 'responding', 'completed', 'failed', 'cancelled', 'timed_out'] as const;
export type AgentRunState = (typeof AGENT_RUN_STATES)[number];
export type AgentErrorClass = 'retryable' | 'non_retryable';

export interface RuntimeLimits {
  maxSteps: number;
  maxToolCalls: number;
  maxTokens: number;
  maxCostUsd: number;
  deadline: Date;
}

export interface RuntimeRun {
  id: string;
  workspaceId: string;
  state: AgentRunState;
  stepCount: number;
  toolCallCount: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  cancellationRequested: boolean;
  limits: RuntimeLimits;
}

export interface RuntimeStep {
  key: string;
  kind: string;
  status: 'started' | 'completed' | 'failed';
  output?: unknown;
}

export interface RuntimeStore {
  getRun(runId: string): Promise<RuntimeRun>;
  transition(runId: string, from: AgentRunState[], to: AgentRunState, reason?: string): Promise<RuntimeRun>;
  heartbeat(runId: string): Promise<void>;
  beginStep(runId: string, key: string, kind: string, input?: unknown): Promise<{ step: RuntimeStep; duplicate: boolean }>;
  completeStep(runId: string, key: string, output?: unknown): Promise<void>;
  failStep(runId: string, key: string, error: ClassifiedAgentError): Promise<void>;
  recordError(runId: string, key: string, error: ClassifiedAgentError): Promise<void>;
  requestCancellation(runId: string): Promise<void>;
}

export interface RuntimeEvents {
  publish(runId: string, event: { type: string; state?: AgentRunState; data?: unknown }): Promise<void> | void;
}

export class ClassifiedAgentError extends Error {
  constructor(message: string, readonly code: string, readonly classification: AgentErrorClass, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ClassifiedAgentError';
  }
}

export function classifyAgentError(error: unknown): ClassifiedAgentError {
  if (error instanceof ClassifiedAgentError) return error;
  const candidate = error as { name?: string; code?: string | number; status?: number; message?: string };
  const retryable = candidate?.name === 'TimeoutError' || candidate?.code === 'ECONNRESET' || candidate?.code === 'ETIMEDOUT' || candidate?.status === 429 || (typeof candidate?.status === 'number' && candidate.status >= 500);
  return new ClassifiedAgentError(candidate?.message ?? String(error), String(candidate?.code ?? (retryable ? 'TRANSIENT_FAILURE' : 'RUNTIME_FAILURE')), retryable ? 'retryable' : 'non_retryable', error instanceof Error ? { cause: error } : undefined);
}
