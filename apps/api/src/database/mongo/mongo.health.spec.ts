import { describe, expect, it, vi } from 'vitest';
import { MongoHealthIndicator } from './mongo.health.js';

describe('Mongo failure handling', () => {
  it('reports MongoDB unavailable without hanging or throwing from readiness', async () => {
    const connection = {
      name: 'test',
      db: { admin: () => ({ ping: vi.fn().mockRejectedValue(new Error('MongoDB unavailable')) }) },
    };
    const down = vi.fn().mockReturnValue({ database: { status: 'down' } });
    const indicator = { check: () => ({ up: vi.fn(), down }) };
    const health = new MongoHealthIndicator(connection as never, indicator as never);
    await expect(health.isHealthy('database')).resolves.toEqual({
      database: { status: 'down' },
    });
    expect(down).toHaveBeenCalledWith({ message: 'MongoDB unavailable' });
  });
});
