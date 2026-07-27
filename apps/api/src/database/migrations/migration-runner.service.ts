import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { MongoConnection } from '../mongo/mongo.connection.js';
import type { Migration, MigrationRunResult } from './migration.interface.js';
import { MigrationState, type MigrationStateDocument } from './migration-state.schema.js';

@Injectable()
export class MigrationRunnerService {
  constructor(
    @InjectModel(MigrationState.name)
    private readonly states: Model<MigrationStateDocument>,
    private readonly mongo: MongoConnection,
  ) {}

  async run(migrations: readonly Migration[]): Promise<MigrationRunResult[]> {
    this.validateDefinitions(migrations);
    const results: MigrationRunResult[] = [];
    for (const migration of migrations) {
      const state = await this.states.findOne({ migrationId: migration.id }).lean().exec();
      const shouldRun =
        !state ||
        (migration.repeatable === true &&
          migration.checksum !== undefined &&
          migration.checksum !== state.checksum);
      if (!shouldRun) {
        results.push({ id: migration.id, status: 'skipped' });
        continue;
      }
      const startedAt = Date.now();
      await migration.up(this.mongo.native);
      await this.states.updateOne(
        { migrationId: migration.id },
        {
          $set: {
            description: migration.description,
            repeatable: migration.repeatable ?? false,
            checksum: migration.checksum,
            executedAt: new Date(),
            durationMs: Date.now() - startedAt,
          },
          $inc: { runCount: 1 },
          $setOnInsert: { migrationId: migration.id },
        },
        { upsert: true },
      );
      results.push({ id: migration.id, status: 'applied' });
    }
    return results;
  }

  private validateDefinitions(migrations: readonly Migration[]): void {
    const ids = new Set<string>();
    for (const migration of migrations) {
      if (ids.has(migration.id)) throw new Error(`Duplicate migration id: ${migration.id}`);
      if (migration.repeatable === true && !migration.checksum) {
        throw new Error(`Repeatable migration ${migration.id} requires a checksum`);
      }
      ids.add(migration.id);
    }
  }
}
