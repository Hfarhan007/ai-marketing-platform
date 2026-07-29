import type { SearchEntity } from './search.types.js';
export interface SearchIndexRecommendation {
  entity: SearchEntity;
  keys: readonly string[];
  reason: string;
}
export const SEARCH_INDEX_RECOMMENDATIONS: readonly SearchIndexRecommendation[] = [
  {
    entity: 'contacts',
    keys: ['workspaceId', 'ownerId', 'lifecycleStatus', 'createdAt', '_id'],
    reason: 'owner and lifecycle lists',
  },
  {
    entity: 'companies',
    keys: ['workspaceId', 'domain', 'createdAt', '_id'],
    reason: 'domain lookup and stable timeline',
  },
  {
    entity: 'leads',
    keys: ['workspaceId', 'status', 'ownerId', 'score', '_id'],
    reason: 'qualification and routing',
  },
  {
    entity: 'deals',
    keys: ['workspaceId', 'pipelineId', 'stageId', 'expectedCloseDate', '_id'],
    reason: 'pipeline forecasting',
  },
  {
    entity: 'tasks',
    keys: ['workspaceId', 'ownerId', 'status', 'dueAt', '_id'],
    reason: 'assignee queues',
  },
  {
    entity: 'conversations',
    keys: ['workspaceId', 'status', 'lastMessageAt', '_id'],
    reason: 'inbox cursor pagination',
  },
  {
    entity: 'campaigns',
    keys: ['workspaceId', 'status', 'scheduledAt', '_id'],
    reason: 'campaign operations',
  },
  {
    entity: 'workflows',
    keys: ['workspaceId', 'status', 'updatedAt', '_id'],
    reason: 'workflow administration',
  },
  {
    entity: 'appointments',
    keys: ['workspaceId', 'staffId', 'startAt', '_id'],
    reason: 'staff calendars',
  },
  { entity: 'files', keys: ['workspaceId', 'status', 'createdAt', '_id'], reason: 'media library' },
];
