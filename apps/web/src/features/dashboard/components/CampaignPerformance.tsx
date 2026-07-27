import { Badge, Table, type TableColumn } from '@/shared/ui';
import type { CampaignRow } from '../types/dashboard.types';

const columns: readonly TableColumn<CampaignRow>[] = [
  { header: 'Campaign', key: 'name', render: (campaign) => <span className="font-medium">{campaign.name}</span> },
  { header: 'Status', key: 'status', render: (campaign) => <Badge tone={campaign.status === 'active' ? 'success' : campaign.status === 'paused' ? 'warning' : 'neutral'}>{campaign.status}</Badge> },
  { align: 'right', header: 'Conversions', key: 'conversions', render: (campaign) => campaign.conversions.toLocaleString() },
  { align: 'right', header: 'Revenue', key: 'revenue', render: (campaign) => `$${campaign.revenue.toLocaleString()}` },
];

export function CampaignPerformance({ campaigns }: { campaigns: readonly CampaignRow[] }) {
  return <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"><div className="mb-4"><h2 className="font-semibold">Campaign performance</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Top campaigns for the selected period.</p></div><Table columns={columns} getRowKey={(campaign) => campaign.name} rows={campaigns} /></section>;
}
