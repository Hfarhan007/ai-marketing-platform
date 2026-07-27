import { ArrowLeft, CheckCircle2, Info, MoreHorizontal, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '@/app/providers';
import { Button, Drawer, Dropdown, EmptyState } from '@/shared/ui';
import { ChannelBadge } from '../components/ChannelBadge';
import { ContactSidebar } from '../components/ContactSidebar';
import { ConversationList, type InboxFilters } from '../components/ConversationList';
import { ConversationThread } from '../components/ConversationThread';
import { MessageComposer } from '../components/MessageComposer';
import { inboxContacts, initialConversations, initialMessages } from '../mocks/inbox.data';
import type { Conversation, Message } from '../types/inbox.types';

const incomingReplies = [
  'Thanks — that’s really helpful. Could you also send the implementation timeline?',
  'Perfect, I’ll share this with the rest of the team.',
  'One more question: can we invite external collaborators?',
];

export function InboxPage() {
  const { workspaceId = 'demo-workspace', conversationId } = useParams();
  const navigate = useNavigate();
  const { notify } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [activeId, setActiveId] = useState<string | undefined>(conversationId);
  const [filters, setFilters] = useState<InboxFilters>({ search: '', channel: '', unreadOnly: false, assignee: '', status: 'open' });
  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [simulationIndex, setSimulationIndex] = useState(0);

  const active = conversations.find(({ id }) => id === activeId);
  const contact = inboxContacts.find(({ id }) => id === active?.contactId);
  const filtered = useMemo(() => conversations.filter((conversation) => {
    const person = inboxContacts.find(({ id }) => id === conversation.contactId);
    const needle = filters.search.toLowerCase();
    return (!needle || `${person?.name ?? ''} ${conversation.subject} ${conversation.preview}`.toLowerCase().includes(needle))
      && (!filters.channel || conversation.channel === filters.channel)
      && (!filters.assignee || conversation.assignee === filters.assignee)
      && (!filters.status || conversation.status === filters.status)
      && (!filters.unreadOnly || conversation.unread > 0);
  }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [conversations, filters]);

  const selectConversation = (id: string) => {
    setActiveId(id); setConversations((current) => current.map((item) => item.id === id ? { ...item, unread: 0 } : item));
    void navigate(`/app/${workspaceId}/inbox/${id}`);
  };
  useEffect(() => {
    if (!active || active.status === 'closed') return;
    const interval = window.setInterval(() => {
      setTyping(true);
      window.setTimeout(() => {
        const body = incomingReplies[simulationIndex % incomingReplies.length]!;
        const createdAt = new Date().toISOString();
        setMessages((current) => [...current, { id: crypto.randomUUID(), conversationId: active.id, sender: 'contact', senderName: contact?.name ?? 'Contact', kind: 'message', body, createdAt, attachments: [] }]);
        setConversations((current) => current.map((item) => item.id === active.id ? { ...item, preview: body, updatedAt: createdAt } : item));
        setTyping(false); setSimulationIndex((value) => value + 1);
      }, 1_800);
    }, 18_000);
    return () => { window.clearInterval(interval); setTyping(false); };
  }, [active, contact?.name, simulationIndex]);

  const send = (body: string) => {
    if (!active) return; const id = crypto.randomUUID(); const createdAt = new Date().toISOString();
    setMessages((current) => [...current, { id, conversationId: active.id, sender: 'agent', senderName: active.assignee === 'Unassigned' ? 'You' : active.assignee, kind: 'message', body, createdAt, status: 'sent', attachments: [] }]);
    setConversations((current) => current.map((item) => item.id === active.id ? { ...item, preview: body, updatedAt: createdAt } : item)); setDraft('');
    window.setTimeout(() => setMessages((current) => current.map((message) => message.id === id ? { ...message, status: 'read' } : message)), 1_200);
  };
  const addNote = (body: string) => {
    if (!active) return;
    setMessages((current) => [...current, { id: crypto.randomUUID(), conversationId: active.id, sender: 'agent', senderName: 'You', kind: 'note', body, createdAt: new Date().toISOString(), attachments: [] }]);
    notify({ title: 'Internal note added', tone: 'success' });
  };
  const patchActive = (patch: Partial<Conversation>) => active && setConversations((current) => current.map((item) => item.id === active.id ? { ...item, ...patch } : item));
  const contactSidebar = active && contact ? <ContactSidebar contact={contact} conversation={active} onAddLabel={(label) => patchActive({ labels: [...new Set([...active.labels, label])] })} onAddNote={addNote} onAssign={(assignee) => { patchActive({ assignee }); notify({ title: `Assigned to ${assignee}`, tone: 'success' }); }} onUseSuggestion={setDraft} /> : null;

  return <div className="-m-4 sm:-m-6 lg:-m-8"><div className="grid h-[calc(100vh-8.5rem)] min-h-[38rem] overflow-hidden border-y border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 md:grid-cols-[20rem_minmax(0,1fr)] xl:grid-cols-[20rem_minmax(0,1fr)_20rem]">
    <div className={active ? 'hidden md:block' : 'block'}><ConversationList {...(activeId ? { activeId } : {})} contacts={inboxContacts} conversations={filtered} filters={filters} onFilters={setFilters} onSelect={selectConversation} /></div>
    <main className={active ? 'flex min-h-0 min-w-0 flex-col' : 'hidden md:flex md:items-center md:justify-center'}>{active && contact ? <><header className="flex min-h-16 items-center gap-3 border-b border-slate-200 px-3 dark:border-slate-800 sm:px-4"><Button aria-label="Back to conversations" className="md:hidden" onClick={() => { setActiveId(undefined); void navigate(`/app/${workspaceId}/inbox`); }} size="sm" variant="ghost"><ArrowLeft size={18} /></Button><div className="min-w-0"><div className="flex items-center gap-2"><h1 className="truncate font-semibold">{contact.name}</h1><ChannelBadge channel={active.channel} /></div><p className="truncate text-xs text-slate-500">{active.subject}</p></div><div className="ml-auto flex items-center gap-1"><Button aria-label="Contact details" className="xl:hidden" onClick={() => setDetailsOpen(true)} size="sm" variant="ghost"><Info size={17} /></Button>{active.status === 'open' ? <Button onClick={() => { patchActive({ status: 'closed' }); notify({ title: 'Conversation closed', tone: 'success' }); }} size="sm" variant="outline"><CheckCircle2 size={15} /><span className="hidden sm:inline">Close</span></Button> : <Button onClick={() => { patchActive({ status: 'open' }); notify({ title: 'Conversation reopened', tone: 'success' }); }} size="sm" variant="outline"><RotateCcw size={15} />Reopen</Button>}<Dropdown items={[{ label: 'Mark unread', onSelect: () => patchActive({ unread: 1 }) }, { label: 'Copy conversation ID', onSelect: () => void navigator.clipboard?.writeText(active.id) }]} label="Conversation actions" trigger={<Button aria-label="Conversation actions" size="sm" variant="ghost"><MoreHorizontal size={17} /></Button>} /></div></header><ConversationThread contact={contact} messages={messages.filter((message) => message.conversationId === active.id)} typing={typing} /><MessageComposer disabled={active.status === 'closed'} draft={draft} onDraft={setDraft} onSend={send} /></> : <EmptyState description="Choose a conversation to view messages and contact context." title="Select a conversation" />}</main>
    <div className="hidden min-h-0 xl:block">{contactSidebar}</div>
  </div><Drawer onClose={() => setDetailsOpen(false)} open={detailsOpen} title="Contact details">{contactSidebar}</Drawer></div>;
}

export default InboxPage;
