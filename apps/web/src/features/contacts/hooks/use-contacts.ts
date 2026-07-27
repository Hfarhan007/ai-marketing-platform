import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/contacts.mock';
import type { ContactInput, ContactsQuery } from '../types/contacts.types';

export const contactKeys = { all: ['contacts'] as const, list: (query: ContactsQuery) => ['contacts', 'list', query] as const, detail: (id: string) => ['contacts', 'detail', id] as const, context: (id: string) => ['contacts', 'context', id] as const };

export function useContacts(query: ContactsQuery) { return useQuery({ queryKey: contactKeys.list(query), queryFn: () => api.listContacts(query), placeholderData: (previous) => previous }); }
export function useContact(id: string) { return useQuery({ queryKey: contactKeys.detail(id), queryFn: () => api.getContact(id), enabled: Boolean(id) }); }
export function useContactContext(id: string) { return useQuery({ queryKey: contactKeys.context(id), queryFn: () => api.getContactContext(id), enabled: Boolean(id) }); }

export function useContactMutations() {
  const client = useQueryClient();
  const invalidate = () => client.invalidateQueries({ queryKey: contactKeys.all });
  return {
    create: useMutation({ mutationFn: api.createContact, onSuccess: invalidate }),
    update: useMutation({ mutationFn: ({ id, input }: { id: string; input: ContactInput }) => api.updateContact(id, input), onSuccess: invalidate }),
    remove: useMutation({ mutationFn: api.deleteContacts, onSuccess: invalidate }),
    addNote: useMutation({ mutationFn: ({ contactId, body }: { contactId: string; body: string }) => api.addContactNote(contactId, body), onSuccess: invalidate }),
    addTask: useMutation({ mutationFn: ({ contactId, title }: { contactId: string; title: string }) => api.addContactTask(contactId, title), onSuccess: invalidate }),
    toggleTask: useMutation({ mutationFn: api.toggleContactTask, onSuccess: invalidate }),
  };
}
