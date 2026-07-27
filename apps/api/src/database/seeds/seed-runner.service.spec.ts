import { describe, expect, it, vi } from 'vitest';
import { MongoConnection } from '../mongo/mongo.connection.js';
import { SeedRunnerService } from './seed-runner.service.js';

describe('SeedRunnerService', () => {
  it('reruns idempotent seeds and upserts execution state', async () => {
    const updateOne = vi.fn().mockResolvedValue({ acknowledged: true });
    const native = { collection: vi.fn().mockReturnValue({ updateOne }) };
    const run = vi.fn().mockResolvedValue(undefined);
    const runner = new SeedRunnerService({ native } as unknown as MongoConnection);
    const seed = { id: 'baseline', description: 'baseline data', run };

    await runner.run([seed]);
    await runner.run([seed]);

    expect(run).toHaveBeenCalledTimes(2);
    expect(updateOne).toHaveBeenCalledTimes(2);
    expect(updateOne).toHaveBeenLastCalledWith(
      { seedId: 'baseline' },
      expect.any(Object),
      { upsert: true },
    );
  });
});
