import { CircleDollarSign, Target, Trophy } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/app/providers';
import { Button, Drawer, EmptyState, Input, MetricCard, Modal } from '@/shared/ui';
import { DealForm } from '../components/DealForm';
import { PipelineBoard } from '../components/PipelineBoard';
import { PipelineToolbar } from '../components/PipelineToolbar';
import { StageSettings } from '../components/StageSettings';
import { usePipelineState } from '../hooks/use-pipeline';
import { pipelines } from '../mocks/pipeline.data';
import type { Deal, DealInput, PipelineStage, StageId } from '../types/pipeline.types';

interface PendingMove { dealId: string; stageId: StageId; overId?: string }

export function PipelinePage() {
  const { notify } = useToast();
  const state = usePipelineState();
  const [pipelineId, setPipelineId] = useState('sales');
  const [search, setSearch] = useState('');
  const [assignee, setAssignee] = useState('');
  const [source, setSource] = useState('');
  const [editing, setEditing] = useState<Deal | 'new' | null>(null);
  const [initialStage, setInitialStage] = useState<StageId>('new-lead');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [lostReason, setLostReason] = useState('');

  const pipelineDeals = state.deals.filter((deal) => deal.pipelineId === pipelineId);
  const visibleDeals = pipelineDeals.filter((deal) => {
    const needle = search.toLowerCase();
    return (!needle || `${deal.contact} ${deal.company} ${deal.tags.join(' ')}`.toLowerCase().includes(needle)) && (!assignee || deal.assignee === assignee) && (!source || deal.source === source);
  });
  const value = pipelineDeals.filter((deal) => deal.stageId !== 'lost').reduce((sum, deal) => sum + deal.value, 0);
  const weighted = pipelineDeals.reduce((sum, deal) => sum + deal.value * (state.stages.find((stage) => stage.id === deal.stageId)?.probability ?? 0) / 100, 0);
  const won = pipelineDeals.filter((deal) => deal.stageId === 'won').reduce((sum, deal) => sum + deal.value, 0);
  const selectedDeal = editing && editing !== 'new' ? state.deals.find(({ id }) => id === editing.id) : undefined;

  const requestMove = (dealId: string, stageId: StageId, overId?: string) => {
    if (stageId === 'won' || stageId === 'lost') setPendingMove({ dealId, stageId, ...(overId ? { overId } : {}) });
    else state.moveDeal(dealId, stageId, overId);
  };
  const confirmMove = () => {
    if (!pendingMove) return;
    const deal = state.deals.find(({ id }) => id === pendingMove.dealId);
    if (pendingMove.stageId === 'lost' && !lostReason.trim()) return;
    if (deal && pendingMove.stageId === 'lost') state.updateDeal(deal.id, { ...deal, stageId: 'lost', lostReason: lostReason.trim() });
    state.moveDeal(pendingMove.dealId, pendingMove.stageId, pendingMove.overId);
    notify({ title: pendingMove.stageId === 'won' ? 'Deal marked won' : 'Deal marked lost', tone: pendingMove.stageId === 'won' ? 'success' : 'info' });
    setPendingMove(null); setLostReason('');
  };
  const saveDeal = (input: DealInput) => {
    if (selectedDeal) state.updateDeal(selectedDeal.id, input); else state.createDeal(pipelineId, input);
    setEditing(null); notify({ title: selectedDeal ? 'Deal updated' : 'Deal created', description: 'Changes were persisted locally.', tone: 'success' });
  };
  const createAt = (stage: PipelineStage) => { setInitialStage(stage.id); setEditing('new'); };

  return <div className="grid min-w-0 gap-6"><header><p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Revenue operations</p><h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Pipeline</h1><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Move opportunities forward and keep every next step visible.</p></header>
    <div className="grid gap-4 sm:grid-cols-3"><MetricCard description="Across active and won deals" icon={<CircleDollarSign size={18} />} label="Pipeline value" value={`$${value.toLocaleString()}`} /><MetricCard description="Stage probability adjusted" icon={<Target size={18} />} label="Weighted forecast" value={`$${Math.round(weighted).toLocaleString()}`} /><MetricCard description={`${pipelineDeals.filter((deal) => deal.stageId === 'won').length} closed deals`} icon={<Trophy size={18} />} label="Won revenue" value={`$${won.toLocaleString()}`} /></div>
    <PipelineToolbar assignee={assignee} onAssignee={setAssignee} onCreate={() => { setInitialStage('new-lead'); setEditing('new'); }} onOpenSettings={() => setSettingsOpen(true)} onPipeline={setPipelineId} onSearch={setSearch} onSource={setSource} pipelineId={pipelineId} pipelines={pipelines} search={search} source={source} />
    {visibleDeals.length ? <PipelineBoard deals={visibleDeals} onCreate={createAt} onEdit={setEditing} onMove={requestMove} onReorder={(stageId, activeId, overId) => state.reorderDeal(pipelineId, stageId, activeId, overId)} stages={state.stages} /> : <EmptyState action={<Button onClick={() => { setSearch(''); setAssignee(''); setSource(''); }}>Clear filters</Button>} description="No deals match the current pipeline filters." title="No deals found" />}
    <Drawer onClose={() => setEditing(null)} open={Boolean(editing)} title={editing === 'new' ? 'Create deal' : 'Edit deal'}>{editing ? <DealForm {...(selectedDeal ? { deal: selectedDeal } : {})} initialStage={initialStage} onCancel={() => setEditing(null)} {...(selectedDeal ? { onDelete: () => { state.removeDeal(selectedDeal.id); setEditing(null); notify({ title: 'Deal deleted', tone: 'success' }); } } : {})} onSubmit={saveDeal} stages={state.stages} /> : null}</Drawer>
    <StageSettings onClose={() => setSettingsOpen(false)} onUpdate={state.updateStage} open={settingsOpen} stages={state.stages} />
    <Modal onClose={() => { setPendingMove(null); setLostReason(''); }} open={Boolean(pendingMove)} title={pendingMove?.stageId === 'won' ? 'Confirm won deal' : 'Record lost deal'}>{pendingMove?.stageId === 'won' ? <p className="text-sm text-slate-600 dark:text-slate-300">Confirm that this opportunity has closed successfully. The pipeline value and won revenue update immediately.</p> : <Input label="Lost reason" onChange={(event) => setLostReason(event.target.value)} placeholder="e.g. Budget, competitor, timing" value={lostReason} />}<div className="mt-5 flex justify-end gap-2"><Button onClick={() => setPendingMove(null)} variant="ghost">Cancel</Button><Button disabled={pendingMove?.stageId === 'lost' && !lostReason.trim()} onClick={confirmMove} variant={pendingMove?.stageId === 'lost' ? 'danger' : 'primary'}>{pendingMove?.stageId === 'won' ? 'Mark as won' : 'Mark as lost'}</Button></div></Modal>
  </div>;
}

export default PipelinePage;
