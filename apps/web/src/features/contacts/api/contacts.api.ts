import { createClient } from '@repo/sdk';
import type { Contact as ApiContact, ContactInput as ApiContactInput } from '@repo/types';
import { appConfig } from '@/app/config/app.config';
import * as contextApi from './contacts.mock';
import type { Contact, ContactInput, ContactsQuery, ContactsResult } from '../types/contacts.types';

const mapContact = (value: ApiContact): Contact => ({
  id: value.id, firstName: value.firstName, lastName: value.lastName,
  email: value.emailAddresses.find((point) => point.primary)?.value ?? value.emailAddresses[0]?.value ?? '',
  phone: value.phoneNumbers.find((point) => point.primary)?.value ?? value.phoneNumbers[0]?.value ?? '',
  company: typeof value.customFields.company === 'string' ? value.customFields.company : '', jobTitle: typeof value.customFields.jobTitle === 'string' ? value.customFields.jobTitle : '',
  status: value.lifecycleStatus === 'customer' || value.lifecycleStatus === 'qualified' || value.lifecycleStatus === 'inactive' ? value.lifecycleStatus : 'lead',
  leadSource: value.source, assignee: value.ownerId ?? 'Unassigned', tags: value.tags,
  consentStatus: value.consentSummary.status === 'granted' || value.consentSummary.status === 'revoked' ? value.consentSummary.status : 'pending',
  communicationPreferences: { email: value.communicationPreferences.email ?? false, phone: value.communicationPreferences.phone ?? false, sms: value.communicationPreferences.sms ?? false },
  customFields: Object.fromEntries(Object.entries(value.customFields).map(([key, item]) => [key, String(item)])),
  createdAt: value.createdAt, lastActivityAt: value.updatedAt, location: value.addresses[0]?.city ?? '', version: value.version, deletedAt: value.deletedAt,
});
const toApiInput = (input: ContactInput): ApiContactInput => ({
  firstName: input.firstName, lastName: input.lastName, displayName: `${input.firstName} ${input.lastName}`.trim(),
  emailAddresses: [{ value: input.email, label: 'work', primary: true }], phoneNumbers: [{ value: input.phone, label: 'work', primary: true }],
  addresses: input.location ? [{ city: input.location }] : [], tags: input.tags,
  customFields: { ...input.customFields, company: input.company, jobTitle: input.jobTitle }, source: input.leadSource,
  communicationPreferences: input.communicationPreferences, consentSummary: { status: input.consentStatus }, lifecycleStatus: input.status,
});
const clientFor = (workspaceId: string) => createClient(appConfig.apiUrl, { headers: () => ({ 'x-workspace-id': workspaceId }) });
export async function listContacts(workspaceId: string, query: ContactsQuery): Promise<ContactsResult> {
  const page = await clientFor(workspaceId).contacts.list({ page: query.page, limit: query.pageSize, search: query.search, status: query.status, sort: query.sort.startsWith('firstName') ? 'displayName' : query.sort.startsWith('lastActivityAt') ? 'updatedAt' : 'createdAt', order: query.sort.endsWith(':asc') ? 'asc' : 'desc' });
  return { items: page.items.map(mapContact), total: page.total, totalPages: Math.max(1, Math.ceil(page.total / query.pageSize)) };
}
export const getContact = async (workspaceId: string, id: string) => mapContact(await clientFor(workspaceId).contacts.get(id));
export const createContact = async (workspaceId: string, input: ContactInput) => mapContact(await clientFor(workspaceId).contacts.create(toApiInput(input)));
export const updateContact = async (workspaceId: string, id: string, input: ContactInput) => {
  if (input.version === undefined) throw new Error('Contact version is required for updates');
  return mapContact(await clientFor(workspaceId).contacts.update(id, { ...toApiInput(input), version: input.version }));
};
export const deleteContacts = async (workspaceId: string, contacts: readonly Pick<Contact, 'id' | 'version'>[]) => Promise.all(contacts.map((contact) => clientFor(workspaceId).contacts.remove(contact.id, contact.version).then(mapContact)));
export const restoreContact = async (workspaceId: string, contact: Pick<Contact, 'id' | 'version'>) => mapContact(await clientFor(workspaceId).contacts.restore(contact.id, contact.version));
export const getContactContext = contextApi.getContactContext;
export const addContactNote = contextApi.addContactNote;
export const addContactTask = contextApi.addContactTask;
export const toggleContactTask = contextApi.toggleContactTask;
