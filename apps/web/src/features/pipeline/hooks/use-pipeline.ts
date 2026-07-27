import { arrayMove } from '@dnd-kit/sortable';
import { useCallback, useEffect, useState } from 'react';
import { defaultStages, initialDeals } from '../mocks/pipeline.data';
import type { Deal, DealInput, PipelineStage, StageId } from '../types/pipeline.types';

const DEALS_KEY = 'crm:pipeline:deals:v1';
const STAGES_KEY = 'crm:pipeline:stages:v1';
const read = <T,>(key: string, fallback: T): T => {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; }
};

export function usePipelineState() {
  const [deals, setDeals] = useState<Deal[]>(() => read(DEALS_KEY, initialDeals));
  const [stages, setStages] = useState<PipelineStage[]>(() => read(STAGES_KEY, defaultStages));
  useEffect(() => localStorage.setItem(DEALS_KEY, JSON.stringify(deals)), [deals]);
  useEffect(() => localStorage.setItem(STAGES_KEY, JSON.stringify(stages)), [stages]);

  const createDeal = useCallback((pipelineId: string, input: DealInput) => setDeals((current) => [...current, { ...input, id: crypto.randomUUID(), pipelineId, order: current.filter((deal) => deal.stageId === input.stageId).length }]), []);
  const updateDeal = useCallback((id: string, input: DealInput) => setDeals((current) => current.map((deal) => deal.id === id ? { ...deal, ...input } : deal)), []);
  const moveDeal = useCallback((dealId: string, targetStage: StageId, overId?: string) => setDeals((current) => {
    const active = current.find((deal) => deal.id === dealId); if (!active) return current;
    const without = current.filter((deal) => deal.id !== dealId);
    const targetDeals = without.filter((deal) => deal.pipelineId === active.pipelineId && deal.stageId === targetStage).sort((a, b) => a.order - b.order);
    const targetIndex = overId ? Math.max(0, targetDeals.findIndex((deal) => deal.id === overId)) : targetDeals.length;
    targetDeals.splice(targetIndex < 0 ? targetDeals.length : targetIndex, 0, { ...active, stageId: targetStage });
    const normalized = targetDeals.map((deal, order) => ({ ...deal, order }));
    return [...without.filter((deal) => !(deal.pipelineId === active.pipelineId && deal.stageId === targetStage)), ...normalized];
  }), []);
  const reorderDeal = useCallback((pipelineId: string, stageId: StageId, activeId: string, overId: string) => setDeals((current) => {
    const inStage = current.filter((deal) => deal.pipelineId === pipelineId && deal.stageId === stageId).sort((a, b) => a.order - b.order);
    const oldIndex = inStage.findIndex(({ id }) => id === activeId); const newIndex = inStage.findIndex(({ id }) => id === overId);
    if (oldIndex < 0 || newIndex < 0) return current;
    const moved = arrayMove(inStage, oldIndex, newIndex).map((deal, order) => ({ ...deal, order }));
    return [...current.filter((deal) => !(deal.pipelineId === pipelineId && deal.stageId === stageId)), ...moved];
  }), []);
  const removeDeal = useCallback((id: string) => setDeals((current) => current.filter((deal) => deal.id !== id)), []);
  const updateStage = useCallback((id: StageId, updates: Pick<PipelineStage, 'color' | 'probability'>) => setStages((current) => current.map((stage) => stage.id === id ? { ...stage, ...updates } : stage)), []);
  return { createDeal, deals, moveDeal, removeDeal, reorderDeal, stages, updateDeal, updateStage };
}
