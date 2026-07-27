import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { Button } from '@/shared/ui';
import { cn } from '@/shared/utils/cn';
import { DealCard } from './DealCard';
import type { Deal, PipelineStage } from '../types/pipeline.types';

export function PipelineColumn({ deals, onCreate, onEdit, stage }: { deals: readonly Deal[]; onCreate: (stage: PipelineStage) => void; onEdit: (deal: Deal) => void; stage: PipelineStage }) {
  const { isOver, setNodeRef } = useDroppable({ id: `stage:${stage.id}`, data: { type: 'stage', stageId: stage.id } });
  const total = deals.reduce((sum, deal) => sum + deal.value, 0);
  return <section aria-labelledby={`stage-${stage.id}`} className={cn('flex w-[19rem] shrink-0 flex-col rounded-2xl bg-slate-100/80 p-3 dark:bg-slate-900/70', isOver && 'ring-2 ring-indigo-500')} ref={setNodeRef}>
    <header className="mb-3 flex items-start gap-2"><span className="mt-1.5 size-2.5 rounded-full" style={{ backgroundColor: stage.color }} /><div className="min-w-0"><h2 className="font-semibold" id={`stage-${stage.id}`}>{stage.name} <span className="text-xs font-normal text-slate-500">{deals.length}</span></h2><p className="text-xs text-slate-500">${total.toLocaleString()} · {stage.probability}% probability</p></div><Button aria-label={`Create deal in ${stage.name}`} className="ml-auto" onClick={() => onCreate(stage)} size="sm" variant="ghost"><Plus size={15} /></Button></header>
    <SortableContext items={deals.map(({ id }) => id)} strategy={verticalListSortingStrategy}><div className="grid min-h-24 content-start gap-2">{deals.map((deal) => <DealCard deal={deal} key={deal.id} onEdit={onEdit} />)}{deals.length === 0 ? <button className="grid min-h-24 place-items-center rounded-xl border border-dashed border-slate-300 text-xs text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-700" onClick={() => onCreate(stage)} type="button">Drop a deal or create one</button> : null}</div></SortableContext>
  </section>;
}
