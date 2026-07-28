import { BadRequestException, ConflictException } from '@nestjs/common';
import { Types } from 'mongoose';
import { describe, expect, it, vi } from 'vitest';
import { CompaniesService } from '../companies/services/companies.service.js';
import { PipelinesService } from '../pipelines/services/pipelines.service.js';

const context = {
  workspaceId: new Types.ObjectId().toHexString(),
  userId: new Types.ObjectId().toHexString(),
  membershipId: new Types.ObjectId().toHexString(),
  roleIds: [],
};
const events = { record: vi.fn().mockResolvedValue(undefined) };
const jobs = { create: vi.fn() };

describe('CRM business rules', () => {
  it('normalizes domains and rejects a tenant-local duplicate', async () => {
    const repository = { findOne: vi.fn().mockResolvedValue({ _id: new Types.ObjectId() }) };
    const service = new CompaniesService(repository as never, events as never, jobs as never);
    await expect(
      service.create(context, {
        name: 'Acme',
        domain: ' ACME.COM ',
        industry: '',
        size: '',
        revenueRange: '',
        addresses: [],
        contactIds: [],
        dealIds: [],
        tags: [],
        customFields: {},
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.findOne).toHaveBeenCalledWith(context.workspaceId, {
      domain: 'acme.com',
      deletedAt: null,
    });
  });

  it('rejects duplicate stage ordering', async () => {
    const service = new PipelinesService({} as never, events as never, jobs as never);
    await expect(
      service.create(context, {
        name: 'Sales',
        status: 'active',
        isDefault: false,
        stages: [
          { name: 'New', order: 0, probability: 10, rules: {} },
          { name: 'Won', order: 0, probability: 100, rules: {} },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
