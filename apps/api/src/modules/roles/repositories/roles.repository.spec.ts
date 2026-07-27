import type { Model } from 'mongoose';
import { describe, expect, it, vi } from 'vitest';
import { RolesRepository } from './roles.repository.js';
import type { Role } from '../schemas/role.schema.js';

describe('RolesRepository', () => {
  it('limits assigned roles to the workspace or global system scope and excludes revoked roles', async () => {
    const exec = vi.fn().mockResolvedValue([]);
    const find = vi.fn().mockReturnValue({ lean: () => ({ exec }) });
    const repository = new RolesRepository({ find } as unknown as Model<Role>);
    const workspaceId = '507f1f77bcf86cd799439011';
    const roleId = '507f1f77bcf86cd799439012';

    await repository.findAssigned(workspaceId, [roleId]);
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'active',
        revokedAt: null,
        $or: [
          { scope: 'system', workspaceId: null },
          expect.objectContaining({ scope: 'workspace' }),
        ],
      }),
    );
  });
});
