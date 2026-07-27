import { MoreHorizontal } from 'lucide-react';
import { Avatar, Badge, Button, Checkbox, Dropdown } from '@/shared/ui';
import type { Contact } from '../types/contacts.types';
import { contactColumnLabels, type ContactColumn } from './contacts-columns';

const tone = (status: Contact['status']) => status === 'customer' ? 'success' : status === 'qualified' ? 'primary' : status === 'inactive' ? 'neutral' : 'warning';

export function ContactsTable({ columns, contacts, onDelete, onEdit, onOpen, onSelect, onSelectAll, selected }: {
  columns: readonly ContactColumn[]; contacts: readonly Contact[]; onDelete: (contact: Contact) => void; onEdit: (contact: Contact) => void;
  onOpen: (contact: Contact) => void; onSelect: (id: string) => void; onSelectAll: () => void; selected: ReadonlySet<string>;
}) {
  const allSelected = contacts.length > 0 && contacts.every((contact) => selected.has(contact.id));
  return <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700"><table className="w-full min-w-[52rem] text-left text-sm">
    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400"><tr>
      <th className="w-12 px-4 py-3"><Checkbox aria-label="Select all contacts on this page" checked={allSelected} label="" onChange={onSelectAll} /></th>
      {columns.map((column) => <th className="px-4 py-3 font-semibold" key={column} scope="col">{contactColumnLabels[column]}</th>)}<th className="w-12 px-4 py-3"><span className="sr-only">Actions</span></th>
    </tr></thead>
    <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-700 dark:bg-slate-950">{contacts.map((contact) => <tr className="hover:bg-slate-50 dark:hover:bg-slate-900" key={contact.id}>
      <td className="px-4 py-3"><Checkbox aria-label={`Select ${contact.firstName} ${contact.lastName}`} checked={selected.has(contact.id)} label="" onChange={() => onSelect(contact.id)} /></td>
      {columns.map((column) => <td className="px-4 py-3" key={column}>{column === 'contact' ? <button className="flex items-center gap-3 text-left focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" onClick={() => onOpen(contact)} type="button"><Avatar alt={`${contact.firstName} ${contact.lastName}`} fallback={`${contact.firstName[0]}${contact.lastName[0]}`} /><span><strong className="block">{contact.firstName} {contact.lastName}</strong><span className="text-xs text-slate-500">{contact.email}</span></span></button> : column === 'company' ? <span><strong className="block font-medium">{contact.company}</strong><span className="text-xs text-slate-500">{contact.jobTitle}</span></span> : column === 'status' ? <Badge tone={tone(contact.status)}>{contact.status}</Badge> : column === 'source' ? contact.leadSource : column === 'owner' ? contact.assignee : new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(contact.lastActivityAt))}</td>)}
      <td className="px-4 py-3"><Dropdown items={[{ label: 'View details', onSelect: () => onOpen(contact) }, { label: 'Edit contact', onSelect: () => onEdit(contact) }, { danger: true, label: 'Delete contact', onSelect: () => onDelete(contact) }]} label={`Actions for ${contact.firstName}`} trigger={<Button aria-label={`Actions for ${contact.firstName}`} size="sm" variant="ghost"><MoreHorizontal size={17} /></Button>} /></td>
    </tr>)}</tbody>
  </table></div>;
}
