import { Injectable } from '@nestjs/common';
import { AiGovernanceRepository } from '../repositories/ai-governance.repository.js';
@Injectable()
export class AiObservabilityService {
  constructor(private readonly repository: AiGovernanceRepository) {}
  start(value: { requestId: string; correlationId: string; workspaceId: string; feature: string; promptVersion?: string; retainedPrompt?: string; deleteAfter?: Date | null; agentId?: string | null; purpose?: string; knowledgeScope?: string[]; permittedTools?: string[]; retentionPolicy?: Record<string, unknown>; budget?: Record<string, unknown>; deadline?: Date }) { return this.repository.startTrace(value); }
  finish(requestId: string, value: { provider?: string; model?: string; latencyMs: number; inputTokens?: number; outputTokens?: number; costUsd?: number; retries?: number; fallbackUsed?: boolean; selectionReason?: string; fallbackReason?: string | null; cacheHit?: boolean; retrievalSources?: string[]; toolCalls?: string[]; safetyInterventions?: string[]; status: string; errorCode?: string }) { return this.repository.finishTrace(requestId, value); }
  deletePrivateData(workspaceId: string, requestId: string) { return this.repository.deletePrivateData(workspaceId, requestId); }
}
