import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { describe, expect, it, vi } from 'vitest';
import { ContactsService } from '../contacts/services/contacts.service.js';
import { DealsService } from '../deals/services/deals.service.js';

const oid = () => new Types.ObjectId();
const context = {
  workspaceId: oid().toHexString(),
  userId: oid().toHexString(),
  membershipId: oid().toHexString(),
  roleIds: [],
};
const transaction = {
  run: <T>(operation: (session: never) => Promise<T>) => operation({} as never),
};
const events = { record: vi.fn().mockResolvedValue(undefined) };
const jobs = { create: vi.fn() };

describe('CRM transactional workflows', () => {
  it('merges contacts inside the transaction and tombstones the source', async () => {
    const source = {
      _id: oid(),
      tags: ['source'],
      companyIds: [],
      emailAddresses: [],
      phoneNumbers: [],
    };
    const target = {
      _id: oid(),
      tags: ['target'],
      companyIds: [],
      emailAddresses: [],
      phoneNumbers: [],
      version: 3,
    };
    const repository = {
      getActive: vi.fn().mockResolvedValueOnce(source).mockResolvedValueOnce(target),
      updateEntity: vi.fn().mockResolvedValueOnce(target).mockResolvedValueOnce(source),
    };
    const service = new ContactsService(
      repository as never,
      transaction as never,
      events as never,
      jobs as never,
    );
    await service.merge(context, {
      sourceId: String(source._id),
      targetId: String(target._id),
      sourceVersion: 1,
      targetVersion: 3,
    });
    expect(repository.updateEntity).toHaveBeenCalledTimes(2);
    expect(repository.updateEntity.mock.calls[1]?.[5]).toBeDefined();
    const recorded = events.record.mock.calls[0]?.[0] as
      { action?: string; session?: unknown } | undefined;
    expect(recorded?.action).toBe('merged');
    expect(recorded?.session).toBeDefined();
  });

  it('prevents a second won/lost transition', async () => {
    events.record.mockClear();
    const repository = { getActive: vi.fn().mockResolvedValue({ _id: oid(), status: 'won' }) };
    const service = new DealsService(
      repository as never,
      events as never,
      jobs as never,
      transaction as never,
    );
    await expect(
      service.transition(context, oid().toHexString(), {
        version: 1,
        status: 'lost',
        reason: 'No budget',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(events.record).not.toHaveBeenCalled();
  });
});
