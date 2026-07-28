import type { Contact } from '../schemas/contact.schema.js';

export const mapContact = (contact: Contact) => ({
  id: String(contact._id),
  firstName: contact.firstName,
  lastName: contact.lastName,
  displayName: contact.displayName,
  emailAddresses: contact.emailAddresses.map(({ value, label, primary }) => ({
    value,
    label,
    primary,
  })),
  phoneNumbers: contact.phoneNumbers.map(({ value, label, primary }) => ({
    value,
    label,
    primary,
  })),
  addresses: contact.addresses,
  tags: contact.tags,
  customFields: contact.customFields,
  source: contact.source,
  ownerId: contact.ownerId ? String(contact.ownerId) : null,
  companyIds: contact.companyIds.map(String),
  communicationPreferences: contact.communicationPreferences,
  consentSummary: contact.consentSummary,
  lifecycleStatus: contact.lifecycleStatus,
  version: contact.version,
  createdAt: contact.createdAt,
  updatedAt: contact.updatedAt,
  deletedAt: contact.deletedAt,
});
