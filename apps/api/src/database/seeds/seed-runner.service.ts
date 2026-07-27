import { Injectable } from '@nestjs/common';
import { MongoConnection } from '../mongo/mongo.connection.js';
import { SEED_STATE_COLLECTION } from '../mongo/mongo.constants.js';
import type { Seed, SeedRunResult } from './seed.interface.js';

@Injectable()
export class SeedRunnerService {
  constructor(private readonly mongo: MongoConnection) {}

  async run(seeds: readonly Seed[]): Promise<SeedRunResult[]> {
    this.validateDefinitions(seeds);
    const results: SeedRunResult[] = [];
    for (const seed of seeds) {
      const startedAt = Date.now();
      await seed.run(this.mongo.native);
      await this.mongo.native.collection(SEED_STATE_COLLECTION).updateOne(
        { seedId: seed.id },
        {
          $set: {
            description: seed.description,
            executedAt: new Date(),
            durationMs: Date.now() - startedAt,
          },
          $inc: { runCount: 1 },
          $setOnInsert: { seedId: seed.id },
        },
        { upsert: true },
      );
      results.push({ id: seed.id, status: 'executed' });
    }
    return results;
  }

  private validateDefinitions(seeds: readonly Seed[]): void {
    const ids = new Set<string>();
    for (const seed of seeds) {
      if (ids.has(seed.id)) throw new Error(`Duplicate seed id: ${seed.id}`);
      ids.add(seed.id);
    }
  }
}
