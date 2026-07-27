import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import { describe, expect, it, vi } from 'vitest';
import { TenantAwareRepository } from './tenant-aware.repository.js';

interface TenantDocument {
  workspaceId: Types.ObjectId;
  name: string;
}

class TestTenantRepository extends TenantAwareRepository<TenantDocument> {
  constructor(model: Model<TenantDocument>) {
    super(model);
  }
}

const workspaceA = '507f1f77bcf86cd799439011';
const workspaceB = '507f1f77bcf86cd799439012';

function query(result: unknown) {
  return { lean: () => ({ exec: vi.fn().mockResolvedValue(result) }) };
}

describe('TenantAwareRepository isolation', () => {
  it('anchors reads to the trusted workspace despite a conflicting caller filter', async () => {
    const findOne = vi.fn().mockReturnValue(query(null));
    const repository = new TestTenantRepository({ findOne } as unknown as Model<TenantDocument>);
    await repository.findOne(workspaceA, { workspaceId: new Types.ObjectId(workspaceB) });

    expect(findOne).toHaveBeenCalledWith({
      $and: [
        { workspaceId: new Types.ObjectId(workspaceA) },
        { workspaceId: new Types.ObjectId(workspaceB) },
      ],
    });
  });

  it('anchors updates to the trusted workspace and rejects workspace mutation', async () => {
    const findOneAndUpdate = vi.fn().mockReturnValue(query(null));
    const repository = new TestTenantRepository({
      findOneAndUpdate,
    } as unknown as Model<TenantDocument>);

    await repository.updateOne(workspaceA, { name: 'record' }, { $set: { name: 'updated' } });
    expect(findOneAndUpdate).toHaveBeenCalledWith(
      {
        $and: [{ workspaceId: new Types.ObjectId(workspaceA) }, { name: 'record' }],
      },
      { $set: { name: 'updated' } },
      { new: true, runValidators: true },
    );
    expect(() =>
      repository.updateOne(workspaceA, {}, {
        $set: { workspaceId: new Types.ObjectId(workspaceB) },
      }),
    ).toThrow('workspaceId cannot be updated');
  });

  it('anchors deletes to the trusted workspace', async () => {
    const exec = vi.fn().mockResolvedValue({ deletedCount: 0 });
    const deleteOne = vi.fn().mockReturnValue({ exec });
    const repository = new TestTenantRepository({ deleteOne } as unknown as Model<TenantDocument>);

    await expect(
      repository.deleteOne(workspaceA, { workspaceId: new Types.ObjectId(workspaceB) }),
    ).resolves.toBe(false);
    expect(deleteOne).toHaveBeenCalledWith({
      $and: [
        { workspaceId: new Types.ObjectId(workspaceA) },
        { workspaceId: new Types.ObjectId(workspaceB) },
      ],
    });
  });

  it('blocks aggregation stages that can reintroduce cross-workspace data', () => {
    const repository = new TestTenantRepository({} as Model<TenantDocument>);
    expect(() =>
      repository.aggregate(workspaceA, [
        { $lookup: { from: 'contacts', localField: 'id', foreignField: 'id', as: 'contacts' } },
      ]),
    ).toThrow('$lookup');
  });
});
