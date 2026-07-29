import { Injectable, NotImplementedException } from '@nestjs/common';
import type { AgentToolPort } from './starter-tools.js';

/**
 * Safe boundary for cross-domain adapters. It deliberately has no database or
 * code execution escape hatch; domain modules replace this port explicitly.
 */
@Injectable()
export class StarterToolProvider implements AgentToolPort {
  invoke(name: string, workspaceId: string, input: Record<string, unknown>): Promise<unknown> {
    if (name === 'book_appointment') return Promise.resolve({ status: 'placeholder', workspaceId, request: input });
    if (name === 'draft_reply') return Promise.resolve({ status: 'drafted', workspaceId, content: input.content });
    if (name === 'escalate_to_human') return Promise.resolve({ status: 'handed_off', workspaceId, ...input });
    throw new NotImplementedException(`Tool adapter is not configured: ${name}`);
  }
}
