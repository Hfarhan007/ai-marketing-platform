import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { describe, expect, it, vi } from 'vitest';
import { CampaignService } from './campaign.service.js';
const context = {
  workspaceId: new Types.ObjectId().toHexString(),
  userId: new Types.ObjectId().toHexString(),
  membershipId: new Types.ObjectId().toHexString(),
  roleIds: [],
};
describe('CampaignService', () => {
  const transactions = {
    run: <T>(operation: (session: never) => Promise<T>) => operation({} as never),
  };
  const outbox = { append: vi.fn().mockResolvedValue({}) };
  it('prevents duplicate campaign runs through the reservation key', async () => {
    const repository = {
      campaign: vi.fn().mockResolvedValue({
        approvalStatus: 'approved',
        channel: 'email',
        audienceId: null,
        segmentId: null,
        timezone: 'UTC',
      }),
      draft: vi.fn().mockResolvedValue({
        _id: new Types.ObjectId(),
        variants: [],
        quietHours: {},
        personalizationDefaults: {},
      }),
      suppressionAddresses: vi.fn().mockResolvedValue([]),
      reserveRun: vi.fn().mockResolvedValue({
        duplicate: true,
        run: { _id: new Types.ObjectId(), totalRecipients: 0 },
      }),
    };
    const contacts = { findMany: vi.fn().mockResolvedValue([]) };
    const service = new CampaignService(
      repository as never,
      contacts as never,
      {} as never,
      {} as never,
      {} as never,
      transactions as never,
      outbox as never,
    );
    const result = await service.schedule(context, new Types.ObjectId().toHexString(), {
      scheduledAt: '2026-08-03T10:00:00Z',
      idempotencyKey: 'same',
    });
    expect(result.duplicate).toBe(true);
    expect(repository.reserveRun).toHaveBeenCalledTimes(1);
  });
  it('cancels active runs and prevents missing run commands', async () => {
    const repository = {
      commandRun: vi
        .fn()
        .mockResolvedValueOnce({ status: 'cancelled' })
        .mockResolvedValueOnce(null),
    };
    const service = new CampaignService(
      repository as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { triggerEvent: vi.fn().mockResolvedValue([]) } as never,
    );
    await expect(
      service.command(context, new Types.ObjectId().toHexString(), 'cancel'),
    ).resolves.toMatchObject({ status: 'cancelled' });
    await expect(
      service.command(context, new Types.ObjectId().toHexString(), 'cancel'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
  it('filters suppression addresses in the repository snapshot path', async () => {
    const repository = { suppressionAddresses: vi.fn().mockResolvedValue(['blocked@example.com']) };
    await expect(
      repository.suppressionAddresses(context.workspaceId, 'email', ['blocked@example.com']),
    ).resolves.toContain('blocked@example.com');
  });
});
