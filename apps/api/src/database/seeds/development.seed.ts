import type { Seed } from './seed.interface.js';

export const developmentSeed: Seed = {
  id: 'development-baseline',
  description: 'Creates the development database metadata document',
  async run(connection) {
    await connection.collection('system_configuration').updateOne(
      { key: 'database_environment' },
      {
        $set: { value: 'development', updatedAt: new Date() },
        $setOnInsert: { key: 'database_environment', createdAt: new Date() },
      },
      { upsert: true },
    );
  },
};
