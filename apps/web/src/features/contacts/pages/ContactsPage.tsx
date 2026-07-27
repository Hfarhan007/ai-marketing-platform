import { Columns3, Download, Plus, Save, Trash2, Upload, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useToast } from '@/app/providers';
import { Button, Checkbox, EmptyState, ErrorState, Modal, Pagination, Select, Skeleton } from '@/shared/ui';
import { ContactDrawer } from '../components/ContactDrawer';
import { ContactFilters } from '../components/ContactFilters';
import { ContactForm } from '../components/ContactForm';
import { contactColumnLabels, type ContactColumn } from '../components/contacts-columns';
import { ContactsTable } from '../components/ContactsTable';
import { useContactMutations, useContacts } from '../hooks/use-contacts';
import type { Contact, ContactInput, ContactsQuery } from '../types/contacts.types';

const initialQuery: ContactsQuery = { search: '', status: '', assignee: '', source: '', sort: 'lastActivityAt:desc', page: 1, pageSize: 8 };
const allColumns = Object.keys(contactColumnLabels) as ContactColumn[];
const views = [{ label: 'All contacts', value: 'all' }, { label: 'Qualified leads', value: 'qualified' }, { label: 'Customers', value: 'customer' }, { label: 'My contacts', value: 'mine' }];

export function ContactsPage() {
  const { notify } = useToast();
  const [query, setQuery] = useState(initialQuery);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [columns, setColumns] = useState<ContactColumn[]>(allColumns);
  const [formContact, setFormContact] = useState<Contact | 'new' | null>(null);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [deleteTargets, setDeleteTargets] = useState<Contact[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const contacts = useContacts(query);
  const mutations = useContactMutations();
  const busy = mutations.create.isPending || mutations.update.isPending || mutations.remove.isPending;
  const selectedContacts = useMemo(() => contacts.data?.items.filter((contact) => selected.has(contact.id)) ?? [], [contacts.data, selected]);

  const applyView = (view: string) => setQuery({ ...initialQuery, status: view === 'qualified' || view === 'customer' ? view : '', assignee: view === 'mine' ? 'Alex Morgan' : '' });
  const saveView = () => { localStorage.setItem('contacts:saved-view', JSON.stringify(query)); notify({ title: 'View saved', description: 'Your filters and sorting were saved locally.', tone: 'success' }); };
  const exportContacts = () => {
    const rows = selectedContacts.length ? selectedContacts : contacts.data?.items ?? [];
    const csv = ['Name,Email,Company,Status,Source,Owner', ...rows.map((contact) => [`${contact.firstName} ${contact.lastName}`, contact.email, contact.company, contact.status, contact.leadSource, contact.assignee].map((value) => `"${value.replaceAll('"', '""')}"`).join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'contacts.csv'; anchor.click(); URL.revokeObjectURL(url);
    notify({ title: 'Contacts exported', description: `${rows.length} mock contacts saved as CSV.`, tone: 'success' });
  };
  const submit = (input: ContactInput) => {
    if (formContact && formContact !== 'new') mutations.update.mutate({ id: formContact.id, input }, { onSuccess: () => { setFormContact(null); notify({ title: 'Contact updated', tone: 'success' }); } });
    else mutations.create.mutate(input, { onSuccess: () => { setFormContact(null); notify({ title: 'Contact created', tone: 'success' }); } });
  };
  const confirmDelete = () => mutations.remove.mutate(deleteTargets.map(({ id }) => id), { onSuccess: () => { setSelected(new Set()); setDeleteTargets([]); setDrawerId(null); notify({ title: 'Contacts deleted', tone: 'success' }); } });

  return <div className="grid gap-6">
    <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Customer relationships</p><h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Contacts</h1><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Organize people, preferences, ownership, and engagement history.</p></div><div className="flex flex-wrap gap-2"><Button onClick={() => setImportOpen(true)} variant="outline"><Upload size={16} />Import</Button><Button disabled={!contacts.data?.items.length} onClick={exportContacts} variant="outline"><Download size={16} />Export</Button><Button onClick={() => setFormContact('new')}><Plus size={16} />Create contact</Button></div></header>

    <div className="flex flex-wrap items-center gap-2"><Select aria-label="Saved view" className="w-44" defaultValue="all" onChange={(event) => applyView(event.target.value)} options={views} /><Button onClick={saveView} size="sm" variant="ghost"><Save size={15} />Save view</Button><Button onClick={() => setColumnsOpen(true)} size="sm" variant="ghost"><Columns3 size={15} />Columns</Button><span className="ml-auto text-sm text-slate-500">{contacts.data?.total ?? 0} contacts</span></div>
    <ContactFilters query={query} setQuery={setQuery} />
    {selected.size ? <div className="flex flex-wrap items-center gap-3 rounded-xl bg-indigo-50 px-4 py-3 text-sm dark:bg-indigo-950/50"><strong>{selected.size} selected</strong><Button onClick={exportContacts} size="sm" variant="ghost"><Download size={14} />Export selected</Button><Button onClick={() => setDeleteTargets(selectedContacts)} size="sm" variant="danger"><Trash2 size={14} />Delete</Button><Button className="ml-auto" onClick={() => setSelected(new Set())} size="sm" variant="ghost">Clear selection</Button></div> : null}

    {contacts.isLoading ? <div className="grid gap-2"><Skeleton className="h-12" />{Array.from({ length: 6 }, (_, index) => <Skeleton className="h-16" key={index} />)}</div> : contacts.isError ? <ErrorState description="The mock contacts service did not respond." loading={contacts.isFetching} onRetry={() => void contacts.refetch()} title="Contacts unavailable" /> : contacts.data?.items.length ? <><ContactsTable columns={columns} contacts={contacts.data.items} onDelete={(contact) => setDeleteTargets([contact])} onEdit={setFormContact} onOpen={(contact) => setDrawerId(contact.id)} onSelect={(id) => setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; })} onSelectAll={() => setSelected((current) => (contacts.data?.items.every(({ id }) => current.has(id)) ? new Set() : new Set(contacts.data?.items.map(({ id }) => id))))} selected={selected} /><div className="flex flex-col items-center justify-between gap-3 sm:flex-row"><Select aria-label="Rows per page" className="w-36" onChange={(event) => setQuery({ ...query, page: 1, pageSize: Number(event.target.value) })} options={[{ label: '8 per page', value: '8' }, { label: '12 per page', value: '12' }]} value={String(query.pageSize)} /><Pagination disabled={contacts.isFetching} onPageChange={(page) => setQuery({ ...query, page })} page={query.page} totalPages={contacts.data.totalPages} /></div></> : <EmptyState action={<Button onClick={() => setFormContact('new')}><Plus size={16} />Create contact</Button>} description="Adjust your filters or add the first person to this view." icon={<Users size={28} />} title="No contacts found" />}

    <Modal loading={busy} onClose={() => setFormContact(null)} open={Boolean(formContact)} title={formContact === 'new' ? 'Create contact' : 'Edit contact'}>{formContact ? <ContactForm {...(formContact === 'new' ? {} : { contact: formContact })} loading={busy} onCancel={() => setFormContact(null)} onSubmit={submit} /> : null}</Modal>
    <Modal loading={mutations.remove.isPending} onClose={() => setDeleteTargets([])} open={deleteTargets.length > 0} title="Delete contacts"><p className="text-sm text-slate-600 dark:text-slate-300">Delete {deleteTargets.length === 1 ? `${deleteTargets[0]!.firstName} ${deleteTargets[0]!.lastName}` : `${deleteTargets.length} contacts`}? This mock action cannot be undone during this session.</p><div className="mt-5 flex justify-end gap-2"><Button onClick={() => setDeleteTargets([])} variant="ghost">Cancel</Button><Button loading={mutations.remove.isPending} onClick={confirmDelete} variant="danger">Delete</Button></div></Modal>
    <Modal onClose={() => setImportOpen(false)} open={importOpen} title="Import contacts" description="Upload a CSV file to simulate an import."><label className="grid cursor-pointer place-items-center rounded-xl border-2 border-dashed border-slate-300 p-8 text-center dark:border-slate-700"><Upload className="mb-2 text-indigo-500" /><strong>Choose a CSV file</strong><span className="mt-1 text-sm text-slate-500">Name, email, phone, company, and tags are supported.</span><input accept=".csv,text/csv" className="sr-only" onChange={(event) => { if (event.target.files?.[0]) { setImportOpen(false); notify({ title: 'Import queued', description: `${event.target.files[0].name} passed mock validation.`, tone: 'success' }); } }} type="file" /></label></Modal>
    <Modal onClose={() => setColumnsOpen(false)} open={columnsOpen} title="Visible columns"><div className="grid gap-3">{allColumns.map((column) => <Checkbox checked={columns.includes(column)} disabled={column === 'contact'} key={column} label={contactColumnLabels[column]} onChange={() => setColumns((current) => current.includes(column) ? current.filter((item) => item !== column) : [...current, column])} />)}</div><Button className="mt-5 w-full" onClick={() => setColumnsOpen(false)}>Apply columns</Button></Modal>
    <ContactDrawer contactId={drawerId} onClose={() => setDrawerId(null)} onEdit={() => { const item = contacts.data?.items.find(({ id }) => id === drawerId); if (item) setFormContact(item); }} />
  </div>;
}

export default ContactsPage;
