export interface Campaign {
  id: string;
  name: string;
  status: 'draft' | 'active' | 'paused' | 'complete';
}

export type ApiResponse<T> = { data: T; error?: never } | { data?: never; error: string };

export interface ContactPoint {
  value: string;
  label: string;
  primary: boolean;
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  emailAddresses: ContactPoint[];
  phoneNumbers: ContactPoint[];
  addresses: Record<string, string>[];
  tags: string[];
  customFields: Record<string, unknown>;
  source: string;
  ownerId: string | null;
  companyIds: string[];
  communicationPreferences: Record<string, boolean>;
  consentSummary: Record<string, string | boolean>;
  lifecycleStatus: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ContactInput {
  firstName: string;
  lastName: string;
  displayName: string;
  emailAddresses: ContactPoint[];
  phoneNumbers: ContactPoint[];
  addresses?: Record<string, string>[];
  tags?: string[];
  customFields?: Record<string, unknown>;
  source?: string;
  ownerId?: string;
  companyIds?: string[];
  communicationPreferences?: Record<string, boolean>;
  consentSummary?: Record<string, string | boolean>;
  lifecycleStatus?: string;
}

export interface ContactUpdateInput extends ContactInput {
  version: number;
}

export interface ContactListQuery {
  cursor?: string;
  page?: number;
  limit?: number;
  search?: string;
  sort?: 'createdAt' | 'updatedAt' | 'displayName' | 'lifecycleStatus';
  order?: 'asc' | 'desc';
  status?: string;
  ownerId?: string;
  tags?: string[];
}

export interface ContactPage {
  items: Contact[];
  total: number;
  page: number;
  limit: number;
  nextCursor: string | null;
}
