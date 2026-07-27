export interface PrivacyRequest { id: string; requestedAt: string; requester: string; status: 'received' | 'processing' | 'completed'; type: 'export' | 'deletion' }
