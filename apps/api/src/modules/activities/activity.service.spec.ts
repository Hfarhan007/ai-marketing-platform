import { describe, expect, it, vi } from 'vitest';
import { ActivityService } from './activity.service.js';

const context = {
  workspaceId: '507f1f77bcf86cd799439011',
  userId: '507f1f77bcf86cd799439012',
  membershipId: '507f1f77bcf86cd799439013',
  roleIds: [],
};

describe('ActivityService visibility', () => {
  it('excludes internal activities for ordinary members', async () => {
    const repository = { page: vi.fn().mockResolvedValue({ items: [], nextCursor: null }) };
    const policy = {
      ability: vi.fn().mockResolvedValue({ permissions: new Set(['contacts.read']) }),
      has: vi.fn().mockReturnValue(false),
    };
    const service = new ActivityService(
      repository as never,
      policy as never,
      {} as never,
      {} as never,
    );
    await service.timeline(context, { limit: 30 });
    expect(repository.page).toHaveBeenCalledWith(
      context.workspaceId,
      expect.objectContaining({
        allowedVisibilities: ['workspace', 'restricted'],
        permissions: ['contacts.read'],
      }),
    );
  });

  it('allows administrators to query internal activities', async () => {
    const repository = { page: vi.fn().mockResolvedValue({ items: [], nextCursor: null }) };
    const policy = {
      ability: vi.fn().mockResolvedValue({ permissions: new Set(['admin.access']) }),
      has: vi.fn().mockReturnValue(true),
    };
    const service = new ActivityService(
      repository as never,
      policy as never,
      {} as never,
      {} as never,
    );
    await service.timeline(context, { limit: 30, visibility: 'internal' });
    expect(repository.page).toHaveBeenCalledWith(
      context.workspaceId,
      expect.objectContaining({ allowedVisibilities: ['internal'] }),
    );
  });
});
