import { ForbiddenException, Injectable } from '@nestjs/common';
import type { Permission } from '../../permissions/constants/permission.catalog.js';
import type { OrchestrationPolicyPort, OrchestrationRole } from './orchestration.types.js';

export const ROLE_POLICIES: Record<OrchestrationRole, { tools: readonly string[]; permissions: readonly Permission[]; scopes: readonly string[] }> = {
  coordinator: { tools: [], permissions: [], scopes: ['delegation_results'] },
  crm_analyst: { tools: ['contact_lookup', 'company_lookup', 'deal_lookup'], permissions: ['contacts.read', 'companies.read', 'deals.read', 'leads.read'], scopes: ['crm'] },
  campaign_analyst: { tools: ['campaign_performance_read'], permissions: ['campaigns.read'], scopes: ['campaign_metrics'] },
  knowledge_researcher: { tools: ['knowledge_search'], permissions: ['files.read'], scopes: ['approved_knowledge'] },
  support_assistant: { tools: ['contact_lookup', 'knowledge_search'], permissions: ['contacts.read', 'files.read', 'inbox.read'], scopes: ['conversation', 'contact_summary'] },
  compliance_reviewer: { tools: ['knowledge_search'], permissions: ['files.read'], scopes: ['message_draft', 'compliance_policy'] },
};

@Injectable()
export class DefaultOrchestrationPolicy implements OrchestrationPolicyPort {
  authorize(input: { role: OrchestrationRole; permissions: Permission[]; tools: string[]; dataScopes: string[] }) {
    const policy = ROLE_POLICIES[input.role];
    if (input.tools.some((tool) => !policy.tools.includes(tool)) || input.permissions.some((permission) => !policy.permissions.includes(permission)) || input.dataScopes.some((scope) => !policy.scopes.includes(scope))) return Promise.reject(new ForbiddenException(`Sub-agent scope exceeds ${input.role} policy`));
    return Promise.resolve();
  }
}

@Injectable()
export class DenySubAgentExecution { execute() { return Promise.reject(new Error('Sub-agent execution adapter is not configured')); } }
@Injectable()
export class NoopOrchestrationAudit { record() { return Promise.resolve(); } }
