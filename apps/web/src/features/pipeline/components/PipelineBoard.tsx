import { closestCorners, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { PipelineColumn } from './PipelineColumn';
import type { Deal, PipelineStage, StageId } from '../types/pipeline.types';

export function PipelineBoard({ deals, onCreate, onEdit, onMove, onReorder, stages }: {
  deals: readonly Deal[]; onCreate: (stage: PipelineStage) => void; onEdit: (deal: Deal) => void;
  onMove: (dealId: string, stageId: StageId, overId?: string) => void; onReorder: (stageId: StageId, activeId: string, overId: string) => void; stages: readonly PipelineStage[];
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const dragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const deal = deals.find(({ id }) => id === active.id); if (!deal) return;
    const overDeal = deals.find(({ id }) => id === over.id);
    const targetStage = (overDeal?.stageId ?? String(over.id).replace('stage:', '')) as StageId;
    if (deal.stageId === targetStage && overDeal) onReorder(targetStage, deal.id, overDeal.id);
    else onMove(deal.id, targetStage, overDeal?.id);
  };
  return <DndContext accessibility={{ announcements: { onDragStart: ({ active }) => `Picked up deal ${String(active.id)}.`, onDragOver: ({ over }) => over ? `Deal is over ${String(over.id)}.` : 'Deal is no longer over a stage.', onDragEnd: ({ over }) => over ? `Deal dropped over ${String(over.id)}.` : 'Drag cancelled.', onDragCancel: () => 'Drag cancelled.' } }} collisionDetection={closestCorners} onDragEnd={dragEnd} sensors={sensors}><div aria-label="CRM pipeline board" className="flex snap-x gap-4 overflow-x-auto pb-5" role="region">{stages.map((stage) => <div className="snap-start" key={stage.id}><PipelineColumn deals={deals.filter((deal) => deal.stageId === stage.id).sort((a, b) => a.order - b.order)} onCreate={onCreate} onEdit={onEdit} stage={stage} /></div>)}</div></DndContext>;
}
