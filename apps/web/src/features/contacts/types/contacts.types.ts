export type ConsentStatus = 'granted' | 'pending' | 'revoked';
export type ContactStatus = 'customer' | 'lead' | 'qualified' | 'inactive';

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  jobTitle: string;
  status: ContactStatus;
  leadSource: string;
  assignee: string;
  tags: string[];
  consentStatus: ConsentStatus;
  communicationPreferences: { email: boolean; phone: boolean; sms: boolean };
  customFields: Record<string, string>;
  createdAt: string;
  lastActivityAt: string;
  location: string;
}

export interface ContactActivity {
  id: string;
  contactId: string;
  type: 'call' | 'email' | 'meeting' | 'note' | 'status';
  title: string;
  description: string;
  occurredAt: string;
}

export interface ContactNote {
  id: string;
  contactId: string;
  body: string;
  author: string;
  createdAt: string;
}

export interface ContactTask {
  id: string;
  contactId: string;
  title: string;
  dueAt: string;
  completed: boolean;
}

export interface ContactsQuery {
  search: string;
  status: string;
  assignee: string;
  source: string;
  sort: string;
  page: number;
  pageSize: number;
}

export interface ContactsResult {
  items: Contact[];
  total: number;
  totalPages: number;
}

export type ContactInput = Omit<Contact, 'createdAt' | 'id' | 'lastActivityAt'>;
