import type { Seed } from './seed.interface.js';

export const testSeed: Seed = {
  id: 'test-baseline',
  description: 'Creates the test database metadata document',
  async run(connection) {
    await connection.collection('system_configuration').updateOne(
      { key: 'database_environment' },
      {
        $set: { value: 'test', updatedAt: new Date() },
        $setOnInsert: { key: 'database_environment', createdAt: new Date() },
      },
      { upsert: true },
    );
  },
};
