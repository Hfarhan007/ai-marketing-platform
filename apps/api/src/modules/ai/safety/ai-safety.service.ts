import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { Permission } from '../../permissions/constants/permission.catalog.js';
import { AiGovernanceRepository } from '../repositories/ai-governance.repository.js';
import { ModerationService } from './moderation.service.js';
import { PiiRedactionService } from './pii-redaction.service.js';
import { PromptInjectionDetector } from './prompt-injection-detector.js';
@Injectable()
export class AiSafetyService {
  constructor(private readonly repository: AiGovernanceRepository, private readonly moderation: ModerationService, private readonly pii: PiiRedactionService, private readonly injection: PromptInjectionDetector) {}
  async preprocess(input: { workspaceId: string; requestId: string; content: string; feature: string }) {
    const policy = await this.repository.policy(input.workspaceId);
    this.moderation.assertSafe(input.content);
    const topic = policy?.blockedTopics.find((value) => input.content.toLocaleLowerCase().includes(value.toLocaleLowerCase()));
    const detected = this.injection.detect(input.content);
    if (topic || (detected.detected && input.feature === 'rag')) {
      await this.block(input, 'input', topic ? `blocked_topic:${topic}` : 'prompt_injection', false);
      throw new BadRequestException('Workspace AI safety policy rejected input');
    }
    const redacted = policy?.redactPii === false ? input.content : this.pii.redact(input.content);
    return { content: redacted, interventions: redacted === input.content ? [] : ['pii_redacted'], retentionDays: policy?.promptRetentionDays ?? 0 };
  }
  async postprocess(input: { workspaceId: string; requestId: string; content: string }) {
    const policy = await this.repository.policy(input.workspaceId);
    this.moderation.assertSafe(input.content);
    if (input.content.length > (policy?.maximumResponseCharacters ?? 20_000)) {
      await this.block(input, 'output', 'maximum_response_length', policy?.escalateOnOutputBlock ?? true);
      throw new BadRequestException('AI response exceeded workspace safety limit');
    }
    const topic = policy?.blockedTopics.find((value) => input.content.toLocaleLowerCase().includes(value.toLocaleLowerCase()));
    if (topic) {
      await this.block(input, 'output', `blocked_topic:${topic}`, policy?.escalateOnOutputBlock ?? true);
      throw new BadRequestException('Workspace AI safety policy rejected output');
    }
    return policy?.redactPii === false ? input.content : this.pii.redact(input.content);
  }
  validateTool(input: { tool: string; permittedTools: string[]; requiredPermission: Permission; permissions: Permission[]; unsafe?: boolean }) {
    if (input.unsafe || ['execute_code', 'database_query', 'shell'].includes(input.tool)) throw new ForbiddenException('Unsafe AI tool blocked');
    if (!input.permittedTools.includes(input.tool) || !input.permissions.includes(input.requiredPermission)) throw new ForbiddenException('AI tool permission denied');
  }
  private async block(input: { workspaceId: string; requestId: string; content: string }, stage: string, reason: string, escalated: boolean) {
    const value = { workspaceId: input.workspaceId, requestId: input.requestId, stage, reason, contentHash: createHash('sha256').update(input.content).digest('hex'), escalated };
    await this.repository.intervention(value);
    if (escalated) await this.repository.incident({ workspaceId: input.workspaceId, requestId: input.requestId, severity: 'high', category: 'ai_safety', summary: reason });
  }
}
