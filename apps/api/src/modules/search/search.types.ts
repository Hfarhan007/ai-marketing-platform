export const SEARCH_ENTITIES = [
  'contacts',
  'companies',
  'leads',
  'deals',
  'tasks',
  'conversations',
  'campaigns',
  'workflows',
  'appointments',
  'files',
] as const;
export type SearchEntity = (typeof SEARCH_ENTITIES)[number];
export type SearchScalarType =
  'string' | 'number' | 'boolean' | 'date' | 'objectId' | 'stringArray';
export const FILTER_OPERATORS = [
  'eq',
  'neq',
  'contains',
  'startsWith',
  'gt',
  'lt',
  'between',
  'in',
  'notIn',
  'exists',
  'relativeDate',
] as const;
export type FilterOperator = (typeof FILTER_OPERATORS)[number];
export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value?: unknown;
}
export interface FilterGroup {
  and?: FilterNode[];
  or?: FilterNode[];
}
export type FilterNode = FilterCondition | FilterGroup;
export interface SearchRequest {
  filter?: FilterNode;
  text?: string;
  sort?: { field: string; direction: 'asc' | 'desc' };
  cursor?: string;
  limit?: number;
  export?: boolean;
}
