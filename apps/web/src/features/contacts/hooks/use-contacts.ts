import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import * as api from '../api/contacts.api';
import type { Contact, ContactInput, ContactsQuery, ContactsResult } from '../types/contacts.types';

export const contactKeys = { all: ['contacts'] as const, list: (query: ContactsQuery) => ['contacts', 'list', query] as const, detail: (id: string) => ['contacts', 'detail', id] as const, context: (id: string) => ['contacts', 'context', id] as const };

export function useContacts(query: ContactsQuery) { const { workspaceId = '' } = useParams(); return useQuery({ queryKey: [workspaceId, ...contactKeys.list(query)], queryFn: () => api.listContacts(workspaceId, query), placeholderData: (previous) => previous }); }
export function useContact(id: string) { const { workspaceId = '' } = useParams(); return useQuery({ queryKey: [workspaceId, ...contactKeys.detail(id)], queryFn: () => api.getContact(workspaceId, id), enabled: Boolean(id && workspaceId) }); }
export function useContactContext(id: string) { return useQuery({ queryKey: contactKeys.context(id), queryFn: () => api.getContactContext(id), enabled: Boolean(id) }); }

export function useContactMutations() {
  const client = useQueryClient();
  const { workspaceId = '' } = useParams();
  const invalidate = () => client.invalidateQueries({ predicate: ({ queryKey }) => queryKey.includes('contacts') });
  const updateCached = (id: string, patch: Partial<Contact>) => {
    client.setQueriesData<ContactsResult>({ predicate: ({ queryKey }) => queryKey.includes('contacts') && queryKey.includes('list') }, (current) => current ? { ...current, items: current.items.map((contact) => contact.id === id ? { ...contact, ...patch } : contact) } : current);
    client.setQueryData<Contact>([workspaceId, ...contactKeys.detail(id)], (current) => current ? { ...current, ...patch } : current);
  };
  return {
    create: useMutation({ mutationFn: (input: ContactInput) => api.createContact(workspaceId, input), onSuccess: invalidate }),
    update: useMutation({ mutationFn: ({ id, input }: { id: string; input: ContactInput }) => api.updateContact(workspaceId, id, input), onMutate: ({ id, input }) => updateCached(id, input), onSettled: invalidate }),
    remove: useMutation({ mutationFn: (contacts: readonly { id: string; version: number }[]) => api.deleteContacts(workspaceId, contacts), onMutate: (removed) => client.setQueriesData<ContactsResult>({ predicate: ({ queryKey }) => queryKey.includes('contacts') && queryKey.includes('list') }, (current) => current ? { ...current, items: current.items.filter((contact) => !removed.some(({ id }) => id === contact.id)) } : current), onSettled: invalidate }),
    restore: useMutation({ mutationFn: (contact: { id: string; version: number }) => api.restoreContact(workspaceId, contact), onSuccess: invalidate }),
    addNote: useMutation({ mutationFn: ({ contactId, body }: { contactId: string; body: string }) => api.addContactNote(contactId, body), onSuccess: invalidate }),
    addTask: useMutation({ mutationFn: ({ contactId, title }: { contactId: string; title: string }) => api.addContactTask(contactId, title), onSuccess: invalidate }),
    toggleTask: useMutation({ mutationFn: api.toggleContactTask, onSuccess: invalidate }),
  };
}
