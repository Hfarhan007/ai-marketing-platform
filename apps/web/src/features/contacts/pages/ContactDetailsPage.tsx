import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '@/app/providers';
import { Button, ErrorState, Modal, Skeleton } from '@/shared/ui';
import { ContactForm } from '../components/ContactForm';
import { ContactProfile } from '../components/ContactProfile';
import { useContact, useContactContext, useContactMutations } from '../hooks/use-contacts';
import type { ContactInput } from '../types/contacts.types';

export function ContactDetailsPage() {
  const { workspaceId = 'demo-workspace', contactId = '' } = useParams();
  const navigate = useNavigate(); const { notify } = useToast(); const [editing, setEditing] = useState(false); const [deleting, setDeleting] = useState(false);
  const contact = useContact(contactId); const context = useContactContext(contactId); const mutations = useContactMutations();
  const back = () => void navigate(`/app/${workspaceId}/contacts`);
  const update = (input: ContactInput) => mutations.update.mutate({ id: contactId, input }, { onSuccess: () => { setEditing(false); notify({ title: 'Contact updated', tone: 'success' }); } });
  const remove = () => { if (contact.data) mutations.remove.mutate([{ id: contactId, version: contact.data.version }], { onSuccess: () => { notify({ title: 'Contact deleted', tone: 'success' }); back(); } }); };
  return <div className="grid gap-6"><header className="flex flex-wrap items-center gap-3"><Button aria-label="Back to contacts" onClick={back} variant="ghost"><ArrowLeft size={18} />Contacts</Button><div className="ml-auto flex gap-2"><Button disabled={!contact.data} onClick={() => setEditing(true)} variant="outline"><Pencil size={16} />Edit</Button><Button disabled={!contact.data} onClick={() => setDeleting(true)} variant="danger"><Trash2 size={16} />Delete</Button></div></header>{contact.isLoading || context.isLoading ? <div className="grid gap-4"><Skeleton className="h-28" /><Skeleton className="h-96" /></div> : contact.isError || context.isError ? <ErrorState description="The requested mock contact could not be loaded." onRetry={() => { void contact.refetch(); void context.refetch(); }} title="Contact unavailable" /> : !contact.data ? <ErrorState description="This contact does not exist or has been removed." title="Contact not found" /> : context.data ? <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900 sm:p-7"><ContactProfile activities={context.data.activities} contact={contact.data} loading={mutations.addNote.isPending || mutations.addTask.isPending} notes={context.data.notes} onAddNote={(body) => mutations.addNote.mutate({ contactId, body })} onAddTask={(title) => mutations.addTask.mutate({ contactId, title })} onToggleTask={(id) => mutations.toggleTask.mutate(id)} tasks={context.data.tasks} /></div> : null}<Modal loading={mutations.update.isPending} onClose={() => setEditing(false)} open={editing} title="Edit contact">{contact.data ? <ContactForm contact={contact.data} loading={mutations.update.isPending} onCancel={() => setEditing(false)} onSubmit={update} /> : null}</Modal><Modal loading={mutations.remove.isPending} onClose={() => setDeleting(false)} open={deleting} title="Delete contact"><p className="text-sm text-slate-600 dark:text-slate-300">This permanently removes the contact from the in-memory mock database for this session.</p><div className="mt-5 flex justify-end gap-2"><Button onClick={() => setDeleting(false)} variant="ghost">Cancel</Button><Button loading={mutations.remove.isPending} onClick={remove} variant="danger">Delete contact</Button></div></Modal></div>;
}

export default ContactDetailsPage;
