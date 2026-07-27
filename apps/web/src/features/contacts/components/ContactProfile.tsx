import { Building2, Check, Mail, MapPin, Phone, UserRound } from 'lucide-react';
import { Avatar, Badge, Tabs } from '@/shared/ui';
import { ContactNotes } from './ContactNotes';
import { ContactTasks } from './ContactTasks';
import { ContactTimeline } from './ContactTimeline';
import type { Contact, ContactActivity, ContactNote, ContactTask } from '../types/contacts.types';

export function ContactProfile({ activities, contact, loading = false, notes, onAddNote, onAddTask, onToggleTask, tasks }: {
  activities: readonly ContactActivity[]; contact: Contact; loading?: boolean; notes: readonly ContactNote[];
  onAddNote: (body: string) => void; onAddTask: (title: string) => void; onToggleTask: (id: string) => void; tasks: readonly ContactTask[];
}) {
  const detail = <div className="grid gap-5 md:grid-cols-2"><Info icon={Mail} label="Email" value={contact.email} /><Info icon={Phone} label="Phone" value={contact.phone} /><Info icon={Building2} label="Company" value={`${contact.jobTitle} at ${contact.company}`} /><Info icon={MapPin} label="Location" value={contact.location} /><Info icon={UserRound} label="Assigned to" value={contact.assignee} /><Info icon={Check} label="Consent" value={contact.consentStatus} /><Info icon={Building2} label="Lead source" value={contact.leadSource} /><Info icon={Check} label="Communication" value={Object.entries(contact.communicationPreferences).filter(([, enabled]) => enabled).map(([channel]) => channel).join(', ') || 'None'} /><div className="md:col-span-2"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Custom fields</p><div className="mt-2 flex flex-wrap gap-2">{Object.entries(contact.customFields).map(([key, value]) => <Badge key={key} tone="neutral">{key}: {value}</Badge>)}</div></div></div>;
  return <div><header className="flex items-start gap-4"><Avatar alt={`${contact.firstName} ${contact.lastName}`} className="size-14 text-lg" fallback={`${contact.firstName[0]}${contact.lastName[0]}`} /><div className="min-w-0"><h1 className="truncate text-xl font-bold">{contact.firstName} {contact.lastName}</h1><p className="text-sm text-slate-500">{contact.jobTitle} · {contact.company}</p><div className="mt-2 flex flex-wrap gap-1.5"><Badge tone="primary">{contact.status}</Badge>{contact.tags.map((tag) => <Badge key={tag} tone="neutral">{tag}</Badge>)}</div></div></header><div className="mt-6"><Tabs defaultValue="details" items={[{ label: 'Profile', value: 'details', content: detail }, { label: 'Activity', value: 'activity', content: <ContactTimeline activities={activities} /> }, { label: `Notes (${notes.length})`, value: 'notes', content: <ContactNotes loading={loading} notes={notes} onAdd={onAddNote} /> }, { label: `Tasks (${tasks.length})`, value: 'tasks', content: <ContactTasks loading={loading} onAdd={onAddTask} onToggle={onToggleTask} tasks={tasks} /> }]} /></div></div>;
}

function Info({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return <div className="flex gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800"><Icon size={16} /></span><div className="min-w-0"><p className="text-xs text-slate-500">{label}</p><p className="truncate text-sm font-medium capitalize">{value}</p></div></div>;
}
