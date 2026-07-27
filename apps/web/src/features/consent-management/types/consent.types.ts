export interface ConsentRecord { channel: string; contact: string; id: string; status: 'granted' | 'withdrawn' | 'pending'; updatedAt: string }
