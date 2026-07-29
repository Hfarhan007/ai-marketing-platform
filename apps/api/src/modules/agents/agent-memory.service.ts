import { Injectable } from '@nestjs/common';
import { AgentMemoryPolicyService } from './agent-memory-policy.service.js';
import { AgentMemoryRepository } from './repositories/agent-memory.repository.js';

@Injectable()
export class AgentMemoryService {
  constructor(private readonly policy: AgentMemoryPolicyService, private readonly repository: AgentMemoryRepository) {}

  async remember(input: { workspaceId: string; agentId: string; subjectId: string; key: string; value: unknown; region?: string; longTermEnabled: boolean; ttlDays: number }) {
    const authorized = await this.policy.authorize(input);
    return this.repository.remember({ ...input, expiresAt: authorized.expiresAt, policyVersionId: authorized.policyVersionId });
  }

  recall(workspaceId: string, agentId: string, subjectId: string, limit?: number) {
    return this.repository.recall(workspaceId, agentId, subjectId, limit);
  }
}
