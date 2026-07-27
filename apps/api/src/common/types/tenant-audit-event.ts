import { requireWorkspaceObjectId } from '../utils/tenant-query.helper.js';

export interface TenantAuditEvent {
  scope: 'workspace';
  workspaceId: string;
  actorId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  occurredAt: string;
}

export interface PlatformAuditEvent {
  scope: 'platform';
  actorId: string;
  authorizationReason: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  occurredAt: string;
}

export type AuditEvent = TenantAuditEvent | PlatformAuditEvent;

export function createTenantAuditEvent(event: TenantAuditEvent): TenantAuditEvent {
  return {
    ...event,
    workspaceId: requireWorkspaceObjectId(event.workspaceId).toHexString(),
  };
}

export function createPlatformAuditEvent(event: PlatformAuditEvent): PlatformAuditEvent {
  if (!event.authorizationReason.trim()) {
    throw new Error('Platform audit events require an authorization reason');
  }
  return event;
}
