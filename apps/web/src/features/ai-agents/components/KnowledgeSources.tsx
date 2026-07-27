import { BookOpen, FileText, Globe2, HelpCircle, Layers3 } from 'lucide-react';
import { Badge, Checkbox, EmptyState } from '@/shared/ui';
import type { Agent, KnowledgeSource } from '../types/agent.types';

const icons = { document: FileText, website: Globe2, faq: HelpCircle, collection: Layers3 };

export function KnowledgeSources({ agent, onChange, sources }: { agent: Agent; onChange: (agent: Agent) => void; sources: readonly KnowledgeSource[] }) {
  return <section><div className="mb-4"><h2 className="font-semibold">Assigned knowledge</h2><p className="text-sm text-slate-500">Choose the mock sources this agent may reference.</p></div>{sources.length ? <div className="grid gap-3">{sources.map((source) => { const Icon = icons[source.kind]; return <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" key={source.id}><Checkbox checked={agent.knowledgeSourceIds.includes(source.id)} label="" onChange={() => onChange({ ...agent, knowledgeSourceIds: agent.knowledgeSourceIds.includes(source.id) ? agent.knowledgeSourceIds.filter((id) => id !== source.id) : [...agent.knowledgeSourceIds, source.id] })} /><Icon className="mt-0.5 shrink-0 text-slate-400" size={18} /><span className="min-w-0 flex-1"><strong className="block text-sm">{source.name}</strong><span className="block text-xs text-slate-500">{source.description}</span></span><Badge tone={source.status === 'ready' ? 'success' : source.status === 'processing' ? 'warning' : 'danger'}>{source.status}</Badge></label>; })}</div> : <EmptyState description="Add documents, websites, FAQs, or collections first." icon={<BookOpen size={26} />} title="No knowledge sources" />}</section>;
}
