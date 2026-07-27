export interface ApiError {
  cause?: unknown;
  code: string;
  details?: Readonly<Record<string, unknown>>;
  message: string;
  retryable: boolean;
  status?: number;
}

export interface PaginatedResult<Item> {
  items: readonly Item[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginationInput { page: number; pageSize: number }
export type SortDirection = 'asc' | 'desc';
export interface SortRule<Key extends string = string> { direction: SortDirection; key: Key }
