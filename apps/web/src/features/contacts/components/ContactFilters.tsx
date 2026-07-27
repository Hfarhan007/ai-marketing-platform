import { Filter, Search, X } from 'lucide-react';
import { Button, Input, Select } from '@/shared/ui';
import type { ContactsQuery } from '../types/contacts.types';

const statuses = [{ label: 'All statuses', value: '' }, ...['lead', 'qualified', 'customer', 'inactive'].map((value) => ({ label: value[0]!.toUpperCase() + value.slice(1), value }))];
const sources = [{ label: 'All sources', value: '' }, ...['Organic search', 'Webinar', 'Referral', 'LinkedIn', 'Partner', 'Paid social', 'Conference'].map((value) => ({ label: value, value }))];
const assignees = [{ label: 'All owners', value: '' }, ...['Alex Morgan', 'Jordan Lee', 'Sam Rivera'].map((value) => ({ label: value, value }))];
const sorts = [{ label: 'Newest activity', value: 'lastActivityAt:desc' }, { label: 'Oldest activity', value: 'lastActivityAt:asc' }, { label: 'Name A–Z', value: 'firstName:asc' }, { label: 'Company A–Z', value: 'company:asc' }];

export function ContactFilters({ query, setQuery }: { query: ContactsQuery; setQuery: (next: ContactsQuery) => void }) {
  const change = (field: keyof ContactsQuery, value: string) => setQuery({ ...query, [field]: value, page: 1 });
  const active = Boolean(query.search || query.status || query.source || query.assignee);
  return <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
    <div className="grid gap-3 lg:grid-cols-[minmax(16rem,1fr)_repeat(4,minmax(9rem,auto))]">
      <Input aria-label="Search contacts" leading={<Search size={16} />} onChange={(event) => change('search', event.target.value)} placeholder="Search name, email, or company…" value={query.search} />
      <Select aria-label="Status filter" options={statuses} onChange={(event) => change('status', event.target.value)} value={query.status} />
      <Select aria-label="Source filter" options={sources} onChange={(event) => change('source', event.target.value)} value={query.source} />
      <Select aria-label="Owner filter" options={assignees} onChange={(event) => change('assignee', event.target.value)} value={query.assignee} />
      <Select aria-label="Sort contacts" options={sorts} onChange={(event) => change('sort', event.target.value)} value={query.sort} />
    </div>
    <div className="flex items-center gap-2 text-xs text-slate-500"><Filter size={14} /><span>Filters update mock server results automatically.</span>{active ? <Button className="ml-auto" onClick={() => setQuery({ ...query, search: '', status: '', source: '', assignee: '', page: 1 })} size="sm" variant="ghost"><X size={14} />Clear</Button> : null}</div>
  </div>;
}
