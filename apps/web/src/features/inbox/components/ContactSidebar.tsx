import { Building2, Mail, MapPin, Phone, Tag, UserRound } from 'lucide-react';
import { useState } from 'react';
import { Avatar, Badge, Button, Input, Select } from '@/shared/ui';
import { AISuggestionPanel } from './AISuggestionPanel';
import { InternalNoteComposer } from './InternalNoteComposer';
import type { Conversation, InboxContact } from '../types/inbox.types';

export function ContactSidebar({ contact, conversation, onAddLabel, onAddNote, onAssign, onUseSuggestion }: {
  contact: InboxContact; conversation: Conversation; onAddLabel: (label: string) => void; onAddNote: (body: string) => void;
  onAssign: (assignee: string) => void; onUseSuggestion: (text: string) => void;
}) {
  const [label, setLabel] = useState('');
  return <aside className="min-h-0 overflow-y-auto border-l border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"><div className="flex items-center gap-3"><Avatar alt={contact.name} size="lg" /><div className="min-w-0"><h2 className="truncate font-bold">{contact.name}</h2><p className="truncate text-sm text-slate-500">{contact.company}</p></div></div><dl className="mt-5 grid gap-3 text-sm"><Info icon={Mail} value={contact.email} /><Info icon={Phone} value={contact.phone} /><Info icon={Building2} value={contact.company} /><Info icon={MapPin} value={contact.location} /><Info icon={UserRound} value={contact.lifecycle} /></dl><div className="mt-5"><Select label="Assigned user" onChange={(event) => onAssign(event.target.value)} options={['Alex Morgan', 'Jordan Lee', 'Sam Rivera', 'Unassigned'].map((value) => ({ label: value, value }))} value={conversation.assignee} /></div><section className="mt-5"><div className="flex items-center gap-2 text-sm font-semibold"><Tag size={15} />Labels</div><div className="mt-2 flex flex-wrap gap-1.5">{conversation.labels.map((item) => <Badge key={item} tone="neutral">{item}</Badge>)}</div><div className="mt-2 flex gap-2"><Input aria-label="Add label" onChange={(event) => setLabel(event.target.value)} placeholder="Add label" value={label} /><Button disabled={!label.trim()} onClick={() => { onAddLabel(label.trim()); setLabel(''); }} size="sm" variant="outline">Add</Button></div></section><div className="mt-5"><AISuggestionPanel onUse={onUseSuggestion} /></div><div className="mt-5"><InternalNoteComposer onAdd={onAddNote} /></div></aside>;
}

function Info({ icon: Icon, value }: { icon: typeof Mail; value: string }) {
  return <div className="flex min-w-0 items-center gap-2 text-slate-600 dark:text-slate-300"><Icon className="shrink-0 text-slate-400" size={15} /><dd className="truncate">{value}</dd></div>;
}
