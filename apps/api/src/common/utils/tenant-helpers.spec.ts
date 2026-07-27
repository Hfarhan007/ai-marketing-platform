import { describe, expect, it } from 'vitest';
import {
  createPlatformAuditEvent,
  createTenantAuditEvent,
} from '../types/tenant-audit-event.js';
import { createTenantJobPayload } from '../types/tenant-job-payload.js';
import { tenantCacheKey } from './tenant-cache-key.helper.js';

const workspaceId = '507f1f77bcf86cd799439011';

describe('tenant payload helpers', () => {
  it('namespaces cache keys and job payloads by validated workspace', () => {
    expect(tenantCacheKey(workspaceId, 'contacts', 'summary')).toBe(
      `tenant:${workspaceId}:contacts:summary`,
    );
    expect(
      createTenantJobPayload({
        workspaceId,
        actorId: 'user',
        idempotencyKey: 'job-1',
        data: { contactId: 'contact' },
      }).workspaceId,
    ).toBe(workspaceId);
  });

  it('requires tenant IDs for workspace audit events and reasons for platform events', () => {
    expect(
      createTenantAuditEvent({
        scope: 'workspace',
        workspaceId,
        actorId: 'user',
        action: 'contact.read',
        resourceType: 'contact',
        occurredAt: new Date(0).toISOString(),
      }).workspaceId,
    ).toBe(workspaceId);
    expect(() =>
      createPlatformAuditEvent({
        scope: 'platform',
        actorId: 'admin',
        authorizationReason: ' ',
        action: 'workspace.inspect',
        resourceType: 'workspace',
        occurredAt: new Date(0).toISOString(),
      }),
    ).toThrow('authorization reason');
  });
});
