export interface Campaign {
  id: string;
  name: string;
  status: 'draft' | 'active' | 'paused' | 'complete';
}

export type ApiResponse<T> = { data: T; error?: never } | { data?: never; error: string };
