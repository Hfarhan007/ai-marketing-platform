import type { Deal, Pipeline, PipelineStage } from '../types/pipeline.types';

export const pipelines: Pipeline[] = [{ id: 'sales', name: 'Sales pipeline' }, { id: 'enterprise', name: 'Enterprise deals' }, { id: 'partnerships', name: 'Partnerships' }];

export const defaultStages: PipelineStage[] = [
  { id: 'new-lead', name: 'New Lead', color: '#64748b', probability: 10 },
  { id: 'contacted', name: 'Contacted', color: '#0ea5e9', probability: 20 },
  { id: 'qualified', name: 'Qualified', color: '#6366f1', probability: 40 },
  { id: 'meeting-booked', name: 'Meeting Booked', color: '#8b5cf6', probability: 55 },
  { id: 'proposal-sent', name: 'Proposal Sent', color: '#f59e0b', probability: 70 },
  { id: 'negotiation', name: 'Negotiation', color: '#f97316', probability: 85 },
  { id: 'won', name: 'Won', color: '#10b981', probability: 100 },
  { id: 'lost', name: 'Lost', color: '#ef4444', probability: 0 },
];

const names = [
  ['Olivia Martin', 'Northstar Labs', 48000, 'Webinar', 'Jordan Lee'],
  ['Ethan Clark', 'Lumon Digital', 72500, 'Referral', 'Alex Morgan'],
  ['Sophia Patel', 'Aperture Studio', 31800, 'Organic', 'Sam Rivera'],
  ['Noah Williams', 'Vertex Cloud', 125000, 'LinkedIn', 'Jordan Lee'],
  ['Mia Chen', 'Pioneer Works', 64000, 'Partner', 'Alex Morgan'],
  ['Liam Davis', 'Orbit Systems', 45500, 'Paid social', 'Sam Rivera'],
  ['Ava Robinson', 'Canvas Health', 89000, 'Conference', 'Jordan Lee'],
  ['Lucas Garcia', 'Kinetic AI', 112000, 'Webinar', 'Alex Morgan'],
  ['Isabella Brown', 'Evergreen Co', 56000, 'Referral', 'Sam Rivera'],
  ['Mateo Wilson', 'Atlas Commerce', 38000, 'Organic', 'Jordan Lee'],
  ['Amelia Anderson', 'Signal House', 97000, 'LinkedIn', 'Alex Morgan'],
  ['James Taylor', 'Relay Finance', 68000, 'Partner', 'Sam Rivera'],
] as const;

export const initialDeals: Deal[] = names.map((item, index) => ({
  id: `deal-${index + 1}`, pipelineId: index > 8 ? 'enterprise' : 'sales', stageId: defaultStages[index % 7]!.id, order: index,
  contact: item[0], company: item[1], value: item[2], source: item[3], assignee: item[4],
  tags: index % 3 === 0 ? ['Enterprise', 'Priority'] : index % 3 === 1 ? ['Inbound'] : ['Nurture'],
  nextActivity: index % 2 ? 'Send follow-up' : 'Discovery call',
  lastActivity: new Date(2026, 6, 22 - index).toISOString(),
  leadScore: 58 + index * 3, expectedCloseDate: new Date(2026, 7 + index % 3, 10 + index).toISOString().slice(0, 10),
}));
