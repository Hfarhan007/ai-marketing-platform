import { Bot, GitBranch, Play, Search, Zap } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/shared/ui';
import { nodeCatalog } from '../constants/node-catalog';
import type { NodeCategory, WorkflowNodeDefinition } from '../types/workflow.types';

const categories: Array<{ id: NodeCategory; label: string; icon: typeof Play }> = [{ id: 'trigger', label: 'Triggers', icon: Play }, { id: 'action', label: 'Actions', icon: Zap }, { id: 'logic', label: 'Logic', icon: GitBranch }, { id: 'ai', label: 'AI', icon: Bot }];

export function NodeLibrary() {
  const [search, setSearch] = useState('');
  return <aside className="min-h-0 overflow-y-auto border-r border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950"><h2 className="font-semibold">Node library</h2><p className="mt-1 text-xs text-slate-500">Drag a node onto the canvas.</p><Input aria-label="Search nodes" className="mt-3" leading={<Search size={14} />} onChange={(event) => setSearch(event.target.value)} placeholder="Search nodes…" value={search} /><div className="mt-4 grid gap-5">{categories.map(({ id, icon: Icon, label }) => { const items = nodeCatalog.filter((node) => node.category === id && node.label.toLowerCase().includes(search.toLowerCase())); return items.length ? <section key={id}><h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500"><Icon size={14} />{label}</h3><div className="grid gap-2">{items.map((node) => <LibraryNode key={node.type} node={node} />)}</div></section> : null; })}</div></aside>;
}

function LibraryNode({ node }: { node: WorkflowNodeDefinition }) {
  return <button className="cursor-grab rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left hover:border-indigo-400 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 active:cursor-grabbing dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-indigo-950" draggable onDragStart={(event) => { event.dataTransfer.setData('application/workflow-node', node.type); event.dataTransfer.effectAllowed = 'move'; }} type="button"><strong className="block text-sm">{node.label}</strong><span className="mt-0.5 block text-xs text-slate-500">{node.description}</span></button>;
}
