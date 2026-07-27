import { MoreHorizontal, Plus, Workflow } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge, Button, Dropdown, EmptyState } from '@/shared/ui';
import { deleteWorkflow, loadWorkflows, saveWorkflow } from '../lib/workflow-storage';
import type { WorkflowDocument } from '../types/workflow.types';

export function WorkflowListPage() {
  const { workspaceId = 'demo-workspace' } = useParams();
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState(loadWorkflows);
  const open = (id: string) => void navigate(`/app/${workspaceId}/workflows/${id}`);
  const remove = (id: string) => { deleteWorkflow(id); setWorkflows(loadWorkflows()); };
  const duplicate = (workflow: WorkflowDocument) => {
    const copy = { ...structuredClone(workflow), id: `${workflow.id}-copy`, name: `${workflow.name} copy`, status: 'draft' as const, updatedAt: new Date().toISOString() };
    saveWorkflow(copy); setWorkflows(loadWorkflows());
  };
  return <div className="grid gap-6"><header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Automation</p><h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Workflows</h1><p className="mt-1 text-sm text-slate-500">Design customer journeys with a visual, frontend-only builder.</p></div><Button onClick={() => void navigate(`/app/${workspaceId}/workflows/new`)}><Plus size={16} />New workflow</Button></header>{workflows.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{workflows.map((workflow) => <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-900" key={workflow.id}><div className="flex items-start gap-3"><span className="grid size-10 place-items-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300"><Workflow size={19} /></span><div className="min-w-0"><h2 className="truncate font-semibold">{workflow.name}</h2><Badge className="mt-1" tone={workflow.status === 'published' ? 'success' : 'warning'}>{workflow.status}</Badge></div><Dropdown items={[{ label: 'Duplicate', onSelect: () => duplicate(workflow) }, { danger: true, label: 'Delete', onSelect: () => remove(workflow.id) }]} label={`Actions for ${workflow.name}`} trigger={<Button aria-label={`Actions for ${workflow.name}`} className="ml-auto" size="sm" variant="ghost"><MoreHorizontal size={17} /></Button>} /></div><p className="mt-4 min-h-10 text-sm text-slate-500">{workflow.description}</p><div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3 text-xs text-slate-500 dark:border-slate-700"><span>{workflow.nodes.length} nodes</span><span>{new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(workflow.updatedAt))}</span></div><Button className="mt-4 w-full" onClick={() => open(workflow.id)} variant="outline">Open builder</Button></article>)}</div> : <EmptyState action={<Button onClick={() => void navigate(`/app/${workspaceId}/workflows/new`)}><Plus size={16} />Create workflow</Button>} description="Create your first visual automation draft." icon={<Workflow size={28} />} title="No workflows yet" />}</div>;
}

export default WorkflowListPage;
