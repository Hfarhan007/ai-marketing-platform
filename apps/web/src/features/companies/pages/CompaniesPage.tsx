import { Building2, Plus } from 'lucide-react';
import { Badge, Button, MetricCard, Table } from '@/shared/ui';

const companies = [
  { id: 'co-1', name: 'Northstar Labs', industry: 'Software', contacts: 12, owner: 'Amina Yusuf', value: '$84,000' },
  { id: 'co-2', name: 'Harbor & Co.', industry: 'Professional services', contacts: 7, owner: 'Omar Ali', value: '$46,500' },
  { id: 'co-3', name: 'Juniper Retail', industry: 'Commerce', contacts: 18, owner: 'Priya Shah', value: '$121,000' },
] as const;

export function CompaniesPage() {
  return <section className="space-y-6"><header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold">Companies</h1><p className="mt-1 text-slate-500 dark:text-slate-400">Manage accounts, stakeholders, and account value.</p></div><Button><Plus size={17} />Add company</Button></header><div className="grid gap-4 sm:grid-cols-3"><MetricCard label="Companies" value="128" /><MetricCard label="Active accounts" value="94" /><MetricCard label="Pipeline value" value="$251.5k" /></div><Table columns={[{ key: 'name', header: 'Company', render: (row) => <span className="flex items-center gap-2 font-medium"><Building2 size={16} />{row.name}</span> }, { key: 'industry', header: 'Industry', render: (row) => row.industry }, { key: 'contacts', header: 'Contacts', render: (row) => row.contacts }, { key: 'owner', header: 'Owner', render: (row) => row.owner }, { key: 'value', header: 'Open value', render: (row) => row.value }, { key: 'status', header: 'Status', render: () => <Badge tone="success">Active</Badge> }]} rows={companies} getRowKey={(row) => row.id} /></section>;
}

export default CompaniesPage;
