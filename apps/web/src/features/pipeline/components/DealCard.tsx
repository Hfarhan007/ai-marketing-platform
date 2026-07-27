import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import { CalendarDays, Clock3, DollarSign, GripVertical, UserRound } from 'lucide-react';
import { Badge } from '@/shared/ui';
import { cn } from '@/shared/utils/cn';
import type { Deal } from '../types/pipeline.types';

const mockReferenceTime = new Date('2026-07-23T12:00:00.000Z').getTime();

export function DealCard({ deal, onEdit }: { deal: Deal; onEdit: (deal: Deal) => void }) {
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({ id: deal.id, data: { type: 'deal', stageId: deal.stageId } });
  return <article className={cn('rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-900', isDragging && 'z-20 opacity-50 shadow-xl')} ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}>
    <div className="flex items-start gap-2"><button aria-label={`Drag ${deal.company}. Use space to pick up, arrow keys to move, and space to drop.`} className="mt-0.5 cursor-grab rounded p-1 text-slate-400 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 active:cursor-grabbing dark:hover:bg-slate-800" type="button" {...attributes} {...listeners}><GripVertical size={17} /></button><button className="min-w-0 flex-1 text-left focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" onClick={() => onEdit(deal)} type="button"><strong className="block truncate text-sm">{deal.company}</strong><span className="block truncate text-xs text-slate-500">{deal.contact}</span></button><span className="shrink-0 text-sm font-bold">${deal.value.toLocaleString()}</span></div>
    <div className="mt-3 flex flex-wrap gap-1">{deal.tags.map((tag) => <Badge key={tag} tone="neutral">{tag}</Badge>)}</div>
    <dl className="mt-3 grid gap-2 text-xs text-slate-500 dark:text-slate-400"><div className="flex items-center gap-1.5"><UserRound size={13} /><dt className="sr-only">Owner</dt><dd>{deal.assignee}</dd><span className="ml-auto rounded-full bg-indigo-50 px-2 py-0.5 font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">Score {deal.leadScore}</span></div><div className="flex items-center gap-1.5"><CalendarDays size={13} /><dt className="sr-only">Expected close</dt><dd>{new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(deal.expectedCloseDate))}</dd><span className="ml-auto">{deal.source}</span></div><div className="flex items-center gap-1.5"><Clock3 size={13} /><dt className="sr-only">Next activity</dt><dd className="truncate">{deal.nextActivity}</dd></div><div className="flex items-center gap-1.5"><DollarSign size={13} /><dt className="sr-only">Last activity</dt><dd>Last touch {new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(Math.round((new Date(deal.lastActivity).getTime() - mockReferenceTime) / 86_400_000), 'day')}</dd></div></dl>
  </article>;
}
