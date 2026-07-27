import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import type { WorkspaceRequestContext } from '../../../common/types/workspace-context.js';
import type { PolicyService } from '../services/policy.service.js';
import type { PrivilegedAuditService } from '../services/privileged-audit.service.js';
import { PermissionGuard } from './permission.guard.js';

const workspaceContext: WorkspaceRequestContext = {
  workspaceId: '507f1f77bcf86cd799439011',
  userId: '507f1f77bcf86cd799439012',
  membershipId: '507f1f77bcf86cd799439013',
  roleIds: [],
};

function executionContext(): ExecutionContext {
  return {
    getHandler: () => function update() {},
    getClass: () => class ContactsController {},
    switchToHttp: () => ({ getRequest: () => ({ workspaceContext }) }),
  } as unknown as ExecutionContext;
}

describe('PermissionGuard', () => {
  it('denies missing permission combinations and audits the decision', async () => {
    const audit = { record: vi.fn().mockResolvedValue(undefined) };
    const guard = new PermissionGuard(
      {
        getAllAndOverride: vi.fn().mockReturnValue({
          permissions: ['contacts.read', 'contacts.update'],
          mode: 'all',
        }),
      } as unknown as Reflector,
      {
        ability: vi.fn().mockResolvedValue({ permissions: new Set(['contacts.read']) }),
        hasAll: vi.fn().mockReturnValue(false),
        hasAny: vi.fn(),
      } as unknown as PolicyService,
      audit as unknown as PrivilegedAuditService,
    );
    await expect(guard.canActivate(executionContext())).rejects.toBeInstanceOf(ForbiddenException);
    expect(audit.record).toHaveBeenCalledWith(
      workspaceContext,
      ['contacts.read', 'contacts.update'],
      false,
      'ContactsController.update',
    );
  });
});
