import type { Contact, ContactActivity, ContactInput, ContactNote, ContactsQuery, ContactsResult, ContactTask } from '../types/contacts.types';

const delay = (duration = 650) => new Promise((resolve) => window.setTimeout(resolve, duration));
const people = [
  ['Olivia', 'Martin', 'Northstar Labs', 'VP of Marketing', 'qualified', 'Webinar', 'Jordan Lee', 'London, UK'],
  ['Ethan', 'Clark', 'Lumon Digital', 'Revenue Director', 'customer', 'Referral', 'Alex Morgan', 'Austin, TX'],
  ['Sophia', 'Patel', 'Aperture Studio', 'Growth Lead', 'lead', 'Organic search', 'Sam Rivera', 'Toronto, CA'],
  ['Noah', 'Williams', 'Vertex Cloud', 'Founder', 'qualified', 'LinkedIn', 'Jordan Lee', 'Berlin, DE'],
  ['Mia', 'Chen', 'Pioneer Works', 'Marketing Manager', 'customer', 'Partner', 'Alex Morgan', 'Singapore'],
  ['Liam', 'Davis', 'Orbit Systems', 'Sales Manager', 'lead', 'Paid social', 'Sam Rivera', 'Denver, CO'],
  ['Ava', 'Robinson', 'Canvas Health', 'COO', 'inactive', 'Conference', 'Jordan Lee', 'Boston, MA'],
  ['Lucas', 'Garcia', 'Kinetic AI', 'Head of Demand', 'customer', 'Webinar', 'Alex Morgan', 'Madrid, ES'],
  ['Isabella', 'Brown', 'Evergreen Co', 'CMO', 'qualified', 'Referral', 'Sam Rivera', 'Portland, OR'],
  ['Mateo', 'Wilson', 'Atlas Commerce', 'Product Lead', 'lead', 'Organic search', 'Jordan Lee', 'Chicago, IL'],
  ['Amelia', 'Anderson', 'Signal House', 'Director of CRM', 'customer', 'LinkedIn', 'Alex Morgan', 'New York, NY'],
  ['James', 'Taylor', 'Relay Finance', 'Partnerships Lead', 'qualified', 'Partner', 'Sam Rivera', 'Dublin, IE'],
] as const;

let contacts: Contact[] = people.map((person, index) => ({
  id: `contact-${index + 1}`,
  firstName: person[0], lastName: person[1], email: `${person[0].toLowerCase()}.${person[1].toLowerCase()}@${person[2].toLowerCase().replaceAll(' ', '')}.com`,
  phone: `+1 415 555 ${String(1100 + index)}`, company: person[2], jobTitle: person[3],
  status: person[4], leadSource: person[5], assignee: person[6], location: person[7],
  tags: index % 3 === 0 ? ['Enterprise', 'High intent'] : index % 3 === 1 ? ['Customer'] : ['Nurture'],
  consentStatus: index % 4 === 0 ? 'pending' : 'granted',
  communicationPreferences: { email: true, phone: index % 2 === 0, sms: index % 3 === 0 },
  customFields: { customerTier: index % 2 === 0 ? 'Enterprise' : 'Growth', annualValue: `$${(24 + index * 7).toString()},000` },
  createdAt: new Date(2025, index % 12, 3 + index).toISOString(),
  lastActivityAt: new Date(2026, 6, 22 - index).toISOString(),
  version: 0,
  deletedAt: null,
}));

let notes: ContactNote[] = contacts.slice(0, 5).map((contact, index) => ({ id: `note-${index}`, contactId: contact.id, body: 'Discussed the team’s growth goals and their upcoming campaign launch.', author: index % 2 ? 'Alex Morgan' : 'Jordan Lee', createdAt: new Date(2026, 6, 18 - index).toISOString() }));
let tasks: ContactTask[] = contacts.slice(0, 6).map((contact, index) => ({ id: `task-${index}`, contactId: contact.id, title: index % 2 ? 'Send pricing follow-up' : 'Schedule discovery call', dueAt: new Date(2026, 6, 25 + index).toISOString(), completed: index === 4 }));

const activitiesFor = (contactId: string): ContactActivity[] => [
  { id: `${contactId}-a1`, contactId, type: 'email', title: 'Campaign email opened', description: 'Opened the Q3 growth playbook email.', occurredAt: '2026-07-22T09:20:00.000Z' },
  { id: `${contactId}-a2`, contactId, type: 'call', title: 'Discovery call completed', description: 'Discussed goals, timeline, and stakeholder requirements.', occurredAt: '2026-07-19T14:00:00.000Z' },
  { id: `${contactId}-a3`, contactId, type: 'status', title: 'Lifecycle stage updated', description: 'Moved from Lead to Qualified.', occurredAt: '2026-07-18T11:45:00.000Z' },
];

export async function listContacts(query: ContactsQuery): Promise<ContactsResult> {
  await delay();
  const search = query.search.toLowerCase();
  let result = contacts.filter((contact) =>
    (!search || `${contact.firstName} ${contact.lastName} ${contact.email} ${contact.company}`.toLowerCase().includes(search))
    && (!query.status || contact.status === query.status)
    && (!query.assignee || contact.assignee === query.assignee)
    && (!query.source || contact.leadSource === query.source));
  const [field, direction] = query.sort.split(':');
  const sortableValue = (contact: Contact) => field === 'firstName' ? contact.firstName : field === 'company' ? contact.company : contact.lastActivityAt;
  result = [...result].sort((a, b) => sortableValue(a).localeCompare(sortableValue(b)) * (direction === 'desc' ? -1 : 1));
  const total = result.length;
  const start = (query.page - 1) * query.pageSize;
  return { items: structuredClone(result.slice(start, start + query.pageSize)), total, totalPages: Math.max(1, Math.ceil(total / query.pageSize)) };
}

export async function getContact(id: string) { await delay(350); return structuredClone(contacts.find((contact) => contact.id === id)); }
export async function createContact(input: ContactInput) { await delay(); const now = new Date().toISOString(); const contact: Contact = { ...input, id: crypto.randomUUID(), createdAt: now, lastActivityAt: now, version: 0, deletedAt: null }; contacts = [contact, ...contacts]; return structuredClone(contact); }
export async function updateContact(id: string, input: ContactInput) { await delay(); contacts = contacts.map((contact) => contact.id === id ? { ...contact, ...input, lastActivityAt: new Date().toISOString() } : contact); return getContact(id); }
export async function deleteContacts(ids: readonly string[]) { await delay(450); contacts = contacts.filter((contact) => !ids.includes(contact.id)); notes = notes.filter((note) => !ids.includes(note.contactId)); tasks = tasks.filter((task) => !ids.includes(task.contactId)); }
export async function getContactContext(id: string) { await delay(300); return { activities: activitiesFor(id), notes: structuredClone(notes.filter((note) => note.contactId === id)), tasks: structuredClone(tasks.filter((task) => task.contactId === id)) }; }
export async function addContactNote(contactId: string, body: string) { await delay(300); const note: ContactNote = { id: crypto.randomUUID(), contactId, body, author: 'You', createdAt: new Date().toISOString() }; notes = [note, ...notes]; return note; }
export async function addContactTask(contactId: string, title: string) { await delay(300); const task: ContactTask = { id: crypto.randomUUID(), contactId, title, dueAt: new Date(Date.now() + 86_400_000).toISOString(), completed: false }; tasks = [task, ...tasks]; return task; }
export async function toggleContactTask(id: string) { await delay(250); tasks = tasks.map((task) => task.id === id ? { ...task, completed: !task.completed } : task); }
