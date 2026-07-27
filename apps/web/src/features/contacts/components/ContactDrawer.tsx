import { ExternalLink, Pencil } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Drawer, ErrorState, Skeleton } from '@/shared/ui';
import { useContact, useContactContext, useContactMutations } from '../hooks/use-contacts';
import { ContactProfile } from './ContactProfile';

export function ContactDrawer({ contactId, onClose, onEdit }: { contactId: string | null; onClose: () => void; onEdit: () => void }) {
  const { workspaceId = 'demo-workspace' } = useParams();
  const navigate = useNavigate();
  const contact = useContact(contactId ?? '');
  const context = useContactContext(contactId ?? '');
  const mutations = useContactMutations();
  const loading = mutations.addNote.isPending || mutations.addTask.isPending || mutations.toggleTask.isPending;
  return <Drawer disabled={loading} onClose={onClose} open={Boolean(contactId)} title="Contact details"><div className="mb-5 flex gap-2"><Button onClick={onEdit} size="sm" variant="outline"><Pencil size={15} />Edit</Button><Button onClick={() => void navigate(`/app/${workspaceId}/contacts/${contactId}`)} size="sm" variant="ghost"><ExternalLink size={15} />Full profile</Button></div>{contact.isLoading || context.isLoading ? <div className="grid gap-3"><Skeleton className="h-20" /><Skeleton className="h-64" /></div> : contact.isError || context.isError ? <ErrorState description="The mock contact profile could not be loaded." title="Contact unavailable" /> : contact.data && context.data ? <ContactProfile activities={context.data.activities} contact={contact.data} loading={loading} notes={context.data.notes} onAddNote={(body) => mutations.addNote.mutate({ contactId: contactId ?? '', body })} onAddTask={(title) => mutations.addTask.mutate({ contactId: contactId ?? '', title })} onToggleTask={(id) => mutations.toggleTask.mutate(id)} tasks={context.data.tasks} /> : null}</Drawer>;
}
