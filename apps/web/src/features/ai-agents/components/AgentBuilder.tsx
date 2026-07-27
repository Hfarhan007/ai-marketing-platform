import { Tabs } from '@/shared/ui';
import { AgentInstructions } from './AgentInstructions';
import { AgentTestConsole } from './AgentTestConsole';
import { EscalationRules } from './EscalationRules';
import { KnowledgeSources } from './KnowledgeSources';
import { ModelSelector } from './ModelSelector';
import { ToolPermissions } from './ToolPermissions';
import type { Agent, KnowledgeSource } from '../types/agent.types';

export function AgentBuilder({ agent, onChange, sources }: { agent: Agent; onChange: (agent: Agent) => void; sources: readonly KnowledgeSource[] }) {
  return <Tabs defaultValue="instructions" items={[
    { label: 'Instructions', value: 'instructions', content: <AgentInstructions agent={agent} onChange={onChange} /> },
    { label: 'Model', value: 'model', content: <ModelSelector agent={agent} onChange={onChange} /> },
    { label: 'Channels & tools', value: 'tools', content: <ToolPermissions agent={agent} onChange={onChange} /> },
    { label: 'Knowledge', value: 'knowledge', content: <KnowledgeSources agent={agent} onChange={onChange} sources={sources} /> },
    { label: 'Escalation', value: 'escalation', content: <EscalationRules agent={agent} onChange={onChange} /> },
    { label: 'Test console', value: 'test', content: <AgentTestConsole agent={agent} /> },
  ]} />;
}
