import { CircleDollarSign, Plus } from 'lucide-react';
import { Badge, Button, MetricCard, Table } from '@/shared/ui';

const deals = [
  { id: 'deal-1', name: 'Northstar expansion', company: 'Northstar Labs', stage: 'Negotiation', owner: 'Amina Yusuf', close: 'Aug 12', value: '$84,000' },
  { id: 'deal-2', name: 'Harbor annual plan', company: 'Harbor & Co.', stage: 'Proposal sent', owner: 'Omar Ali', close: 'Aug 20', value: '$46,500' },
  { id: 'deal-3', name: 'Juniper rollout', company: 'Juniper Retail', stage: 'Qualified', owner: 'Priya Shah', close: 'Sep 03', value: '$121,000' },
] as const;

export function DealsPage() {
  return <section className="space-y-6"><header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold">Deals</h1><p className="mt-1 text-slate-500 dark:text-slate-400">Review opportunities in a sortable deal register.</p></div><Button><Plus size={17} />Create deal</Button></header><div className="grid gap-4 sm:grid-cols-3"><MetricCard label="Open deals" value="54" /><MetricCard label="Open value" value="$251.5k" /><MetricCard label="Forecast" value="$167.2k" /></div><Table columns={[{ key: 'name', header: 'Deal', render: (row) => <span className="flex items-center gap-2 font-medium"><CircleDollarSign size={16} />{row.name}</span> }, { key: 'company', header: 'Company', render: (row) => row.company }, { key: 'stage', header: 'Stage', render: (row) => <Badge>{row.stage}</Badge> }, { key: 'owner', header: 'Owner', render: (row) => row.owner }, { key: 'close', header: 'Expected close', render: (row) => row.close }, { key: 'value', header: 'Value', render: (row) => row.value }]} rows={deals} getRowKey={(row) => row.id} /></section>;
}

export default DealsPage;
