import { ForbiddenException, Injectable } from '@nestjs/common';
@Injectable()
export class AgentExecutionPolicy {
  assertBudget(run: { iteration: number; toolCallCount: number; costUsd: number; deadline: Date }, limits: { maxIterations: number; maxToolCalls: number; maxCostUsd: number }) {
    if (run.iteration >= limits.maxIterations) throw new ForbiddenException('Agent loop limit exhausted');
    if (run.toolCallCount >= limits.maxToolCalls) throw new ForbiddenException('Agent tool-call limit exhausted');
    if (run.costUsd >= limits.maxCostUsd) throw new ForbiddenException('Agent execution budget exhausted');
    if (run.deadline.valueOf() <= Date.now()) throw new ForbiddenException('Agent execution deadline exceeded');
  }
}
