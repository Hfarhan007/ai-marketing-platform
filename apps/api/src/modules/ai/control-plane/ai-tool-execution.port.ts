import type { AiExecutionContext } from './ai-execution.types.js';
export interface AiToolExecutionPort {
  execute(calls: Array<{ name: string; arguments: Record<string, unknown> }>, context: AiExecutionContext): Promise<unknown[]>;
}
export const AI_TOOL_EXECUTION_PORT = Symbol('AI_TOOL_EXECUTION_PORT');
export class DenyByDefaultAiToolExecutor implements AiToolExecutionPort {
  execute(calls: Array<{ name: string }>) {
    if (calls.length) return Promise.reject(new Error('AI tool execution adapter is not configured'));
    return Promise.resolve([]);
  }
}
