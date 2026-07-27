import type { Model } from 'mongoose';
import { describe, expect, it, vi } from 'vitest';
import { MongoConnection } from '../mongo/mongo.connection.js';
import type { Migration } from './migration.interface.js';
import { MigrationRunnerService } from './migration-runner.service.js';
import type { MigrationStateDocument } from './migration-state.schema.js';

describe('MigrationRunnerService', () => {
  it('runs new migrations and records them with an upsert', async () => {
    const exec = vi.fn().mockResolvedValue(null);
    const updateOne = vi.fn().mockResolvedValue({ acknowledged: true });
    const states = {
      findOne: vi.fn().mockReturnValue({ lean: () => ({ exec }) }),
      updateOne,
    };
    const mongo = { native: {} };
    const up = vi.fn().mockResolvedValue(undefined);
    const migration: Migration = { id: '001', description: 'first', up };
    const runner = new MigrationRunnerService(
      states as unknown as Model<MigrationStateDocument>,
      mongo as MongoConnection,
    );

    await expect(runner.run([migration])).resolves.toEqual([{ id: '001', status: 'applied' }]);
    expect(up).toHaveBeenCalledOnce();
    expect(updateOne).toHaveBeenCalledWith(
      { migrationId: '001' },
      expect.any(Object),
      { upsert: true },
    );
  });

  it('skips unchanged repeatable migrations and reapplies changed checksums', async () => {
    const exec = vi
      .fn()
      .mockResolvedValueOnce({ migrationId: 'repeatable', checksum: 'same' })
      .mockResolvedValueOnce({ migrationId: 'repeatable', checksum: 'old' });
    const states = {
      findOne: vi.fn().mockReturnValue({ lean: () => ({ exec }) }),
      updateOne: vi.fn().mockResolvedValue({ acknowledged: true }),
    };
    const up = vi.fn().mockResolvedValue(undefined);
    const runner = new MigrationRunnerService(
      states as unknown as Model<MigrationStateDocument>,
      { native: {} } as MongoConnection,
    );

    await expect(
      runner.run([{ id: 'repeatable', description: 'view', repeatable: true, checksum: 'same', up }]),
    ).resolves.toEqual([{ id: 'repeatable', status: 'skipped' }]);
    await expect(
      runner.run([{ id: 'repeatable', description: 'view', repeatable: true, checksum: 'new', up }]),
    ).resolves.toEqual([{ id: 'repeatable', status: 'applied' }]);
    expect(up).toHaveBeenCalledOnce();
  });
});
