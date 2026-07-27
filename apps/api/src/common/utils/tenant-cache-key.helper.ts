import { requireWorkspaceObjectId } from './tenant-query.helper.js';

export function tenantCacheKey(workspaceId: string, ...segments: readonly string[]): string {
  const normalizedWorkspaceId = requireWorkspaceObjectId(workspaceId).toHexString();
  if (segments.length === 0 || segments.some((segment) => !/^[a-zA-Z0-9._-]+$/u.test(segment))) {
    throw new Error('Tenant cache keys require safe, non-empty segments');
  }
  return ['tenant', normalizedWorkspaceId, ...segments].join(':');
}
