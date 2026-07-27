import { Bot, Plus } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, EmptyState } from '@/shared/ui';
import { AgentCard } from '../components/AgentCard';
import { useAgentData } from '../hooks/use-agent-data';

export function AgentsPage() {
  const { workspaceId = 'demo-workspace' } = useParams(); const navigate = useNavigate(); const data = useAgentData();
  const open = (id: string) => void navigate(`/app/${workspaceId}/agents/${id}`);
  return <div className="grid gap-6"><header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">AI workforce</p><h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">AI agents</h1><p className="mt-1 text-sm text-slate-500">Configure frontend-only agents for sales, support, and customer engagement.</p></div><Button onClick={() => open('new')}><Plus size={16} />Create agent</Button></header>{data.agents.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.agents.map((agent) => <AgentCard agent={agent} key={agent.id} onDelete={() => data.deleteAgent(agent.id)} onOpen={() => open(agent.id)} onToggle={() => data.updateAgent(agent.id, { ...agent, status: agent.status === 'active' ? 'paused' : 'active' })} />)}</div> : <EmptyState action={<Button onClick={() => open('new')}><Plus size={16} />Create agent</Button>} description="Create a mock agent to begin configuring behavior." icon={<Bot size={28} />} title="No agents yet" />}</div>;
}

export default AgentsPage;
