import { Injectable } from '@nestjs/common';
import { AiGovernanceRepository } from '../repositories/ai-governance.repository.js';
@Injectable()
export class AiAdminReportService {
  constructor(private readonly repository: AiGovernanceRepository) {}
  async generate(workspaceId: string, since: Date) {
    const [cost, failures, safetyBlocks, hallucinations, evaluationTrends] = await this.repository.report(workspaceId, since);
    return { cost: cost[0] ?? { cost: 0, inputTokens: 0, outputTokens: 0, requests: 0 }, failures, safetyBlocks, hallucinations: hallucinations[0]?.count ?? 0, evaluationTrends };
  }
}
