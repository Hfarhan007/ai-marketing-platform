import { requireWorkspaceObjectId } from '../utils/tenant-query.helper.js';

export interface TenantJobPayload<T extends Record<string, unknown> = Record<string, never>> {
  workspaceId: string;
  actorId: string;
  idempotencyKey: string;
  data: T;
}

export function createTenantJobPayload<T extends Record<string, unknown>>(
  payload: TenantJobPayload<T>,
): TenantJobPayload<T> {
  return {
    ...payload,
    workspaceId: requireWorkspaceObjectId(payload.workspaceId).toHexString(),
  };
}
