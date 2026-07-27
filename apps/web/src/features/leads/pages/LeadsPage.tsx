import { Plus, TrendingUp } from 'lucide-react';
import { Badge, Button, MetricCard, Table } from '@/shared/ui';

const leads = [
  { id: 'lead-1', name: 'Nora Reed', company: 'Northstar Labs', score: 92, source: 'LinkedIn', owner: 'Amina Yusuf' },
  { id: 'lead-2', name: 'Daniel Kim', company: 'Harbor & Co.', score: 81, source: 'Web form', owner: 'Omar Ali' },
  { id: 'lead-3', name: 'Sofia Malik', company: 'Juniper Retail', score: 74, source: 'Referral', owner: 'Priya Shah' },
] as const;

export function LeadsPage() {
  return <section className="space-y-6"><header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold">Leads</h1><p className="mt-1 text-slate-500 dark:text-slate-400">Prioritize prospects using qualification and engagement signals.</p></div><Button><Plus size={17} />Add lead</Button></header><div className="grid gap-4 sm:grid-cols-3"><MetricCard label="Open leads" value="386" /><MetricCard label="Qualified this month" value="72" /><MetricCard label="Average score" value="78" /></div><Table columns={[{ key: 'name', header: 'Lead', render: (row) => <span className="font-medium">{row.name}</span> }, { key: 'company', header: 'Company', render: (row) => row.company }, { key: 'score', header: 'Score', render: (row) => <Badge tone={row.score >= 85 ? 'success' : 'warning'}><TrendingUp size={13} />{row.score}</Badge> }, { key: 'source', header: 'Source', render: (row) => row.source }, { key: 'owner', header: 'Owner', render: (row) => row.owner }]} rows={leads} getRowKey={(row) => row.id} /></section>;
}

export default LeadsPage;
