export const stageIds = ['new-lead', 'contacted', 'qualified', 'meeting-booked', 'proposal-sent', 'negotiation', 'won', 'lost'] as const;
export type StageId = typeof stageIds[number];

export interface PipelineStage {
  id: StageId;
  name: string;
  color: string;
  probability: number;
}

export interface Deal {
  id: string;
  pipelineId: string;
  stageId: StageId;
  order: number;
  contact: string;
  company: string;
  value: number;
  source: string;
  assignee: string;
  tags: string[];
  nextActivity: string;
  lastActivity: string;
  leadScore: number;
  expectedCloseDate: string;
  lostReason?: string;
}

export interface Pipeline {
  id: string;
  name: string;
}

export type DealInput = Omit<Deal, 'id' | 'order' | 'pipelineId'>;
