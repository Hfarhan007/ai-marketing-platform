import { ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { describe, expect, it, vi } from 'vitest';
import type { WorkspaceRequestContext } from '../../../common/types/workspace-context.js';
import type { RolesRepository } from '../../roles/repositories/roles.repository.js';
import { RoleScope, RoleStatus } from '../../roles/schemas/role.schema.js';
import type { PermissionCacheService } from './permission-cache.service.js';
import { PolicyService } from './policy.service.js';

const context: WorkspaceRequestContext = {
  workspaceId: '507f1f77bcf86cd799439011',
  userId: '507f1f77bcf86cd799439012',
  membershipId: '507f1f77bcf86cd799439013',
  roleIds: ['507f1f77bcf86cd799439014'],
};

function policy(rolesValue: unknown[]) {
  const cache = { get: vi.fn().mockResolvedValue(null), set: vi.fn().mockResolvedValue(undefined) };
  return new PolicyService(
    { findAssigned: vi.fn().mockResolvedValue(rolesValue) } as unknown as RolesRepository,
    cache as unknown as PermissionCacheService,
  );
}

describe('PolicyService', () => {
  it('combines direct permissions and permission groups', async () => {
    const service = policy([
      {
        _id: new Types.ObjectId(),
        scope: RoleScope.Workspace,
        status: RoleStatus.Active,
        immutable: false,
        permissions: ['inbox.reply'],
        permissionGroups: ['contactsEditor'],
      },
    ]);
    const ability = await service.ability(context);
    expect(service.hasAll(ability, ['contacts.read', 'contacts.update', 'inbox.reply'])).toBe(true);
    expect(service.has(ability, 'contacts.delete')).toBe(false);
  });

  it('honors administrative wildcards only on immutable system roles', async () => {
    const custom = policy([
      {
        scope: RoleScope.Workspace,
        immutable: false,
        permissions: ['admin.*'],
        permissionGroups: [],
      },
    ]);
    expect(custom.has(await custom.ability(context), 'admin.access')).toBe(false);

    const system = policy([
      {
        scope: RoleScope.System,
        immutable: true,
        permissions: ['admin.*'],
        permissionGroups: [],
      },
    ]);
    expect(system.has(await system.ability(context), 'admin.access')).toBe(true);
    expect(system.has(await system.ability(context), 'billing.manage')).toBe(false);
  });

  it('enforces ownership unless an explicit management permission is present', () => {
    const service = policy([]);
    const baseAbility = {
      workspaceId: context.workspaceId,
      userId: context.userId,
      membershipId: context.membershipId,
      permissions: new Set<'deals.manage'>(),
    };
    expect(() => service.assertOwnership(baseAbility, 'another-user', 'deals.manage')).toThrow(
      ForbiddenException,
    );
    const manager = { ...baseAbility, permissions: new Set<'deals.manage'>(['deals.manage']) };
    expect(() => service.assertOwnership(manager, 'another-user', 'deals.manage')).not.toThrow();
  });
});
