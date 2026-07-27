export type ContactColumn = 'contact' | 'company' | 'status' | 'source' | 'owner' | 'lastActivity';

export const contactColumnLabels: Record<ContactColumn, string> = {
  contact: 'Contact',
  company: 'Company',
  status: 'Status',
  source: 'Lead source',
  owner: 'Owner',
  lastActivity: 'Last activity',
};
