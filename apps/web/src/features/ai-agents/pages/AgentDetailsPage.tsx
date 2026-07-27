import { ArrowLeft, Save } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '@/app/providers';
import { Avatar, Badge, Button, ErrorState } from '@/shared/ui';
import { AgentBuilder } from '../components/AgentBuilder';
import { useAgentData } from '../hooks/use-agent-data';
import type { Agent } from '../types/agent.types';

const createAgent = (): Agent => ({ id: 'agent-draft', name: 'New agent', description: 'Describe how this agent helps your customers.', avatar: 'NA', status: 'draft', language: 'English', tone: 'professional', systemInstructions: 'Answer questions using only assigned knowledge sources. Clearly state when information is unavailable.', welcomeMessage: 'Hi! How can I help you today?', provider: 'Mock', model: 'Mock Reasoning Pro', temperature: 0.4, responseLength: 'medium', channels: ['website'], tools: ['Search knowledge'], escalationRules: [], businessHours: 'Mon–Fri, 09:00–18:00', fallbackResponse: 'I’m not sure about that. Let me connect you with a teammate.', knowledgeSourceIds: [], conversations: 0, resolutionRate: 0 });

export function AgentDetailsPage() {
  const { agentId = 'new', workspaceId = 'demo-workspace' } = useParams(); const navigate = useNavigate(); const { notify } = useToast(); const data = useAgentData();
  const existing = data.agents.find(({ id }) => id === agentId); const isNew = agentId === 'new'; const [agent, setAgent] = useState<Agent>(() => existing ?? createAgent()); const [dirty, setDirty] = useState(false);
  const change = (next: Agent) => { setAgent(next); setDirty(true); };
  const save = () => { if (!agent.name.trim()) return; if (isNew) data.createAgent({ ...agent, id: agent.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'new-agent' }); else data.updateAgent(agent.id, agent); setDirty(false); notify({ title: 'Agent saved locally', tone: 'success' }); if (isNew) void navigate(`/app/${workspaceId}/agents`); };
  if (!isNew && !existing) return <ErrorState description="This mock agent does not exist or was deleted." onRetry={() => void navigate(`/app/${workspaceId}/agents`)} title="Agent not found" />;
  return <div className="grid gap-6"><header className="flex flex-wrap items-center gap-3"><Button onClick={() => void navigate(`/app/${workspaceId}/agents`)} variant="ghost"><ArrowLeft size={17} />Agents</Button><Avatar alt={agent.name} fallback={agent.avatar} /><div className="min-w-0"><h1 className="truncate text-xl font-bold">{agent.name}</h1><Badge tone={agent.status === 'active' ? 'success' : 'warning'}>{agent.status}</Badge></div><Button className="ml-auto" disabled={!dirty && !isNew} onClick={save}><Save size={16} />Save agent</Button></header><div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:p-6"><AgentBuilder agent={agent} onChange={change} sources={data.sources} /></div></div>;
}

export default AgentDetailsPage;
