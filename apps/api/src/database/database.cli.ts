import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ConfigurationModule } from '../config/configuration.module.js';
import { DatabaseModule } from './database.module.js';
import { IndexManagerService } from './indexes/index-manager.service.js';
import { MigrationRunnerService } from './migrations/migration-runner.service.js';
import { migrations } from './migrations/scripts/index.js';
import { developmentSeed } from './seeds/development.seed.js';
import { SeedRunnerService } from './seeds/seed-runner.service.js';
import type { Seed } from './seeds/seed.interface.js';
import { testSeed } from './seeds/test.seed.js';

@Module({ imports: [ConfigurationModule, DatabaseModule] })
class DatabaseCliModule {}

type DatabaseCommand = 'indexes' | 'migrate' | 'seed';

async function run(): Promise<void> {
  const command = process.argv[2] as DatabaseCommand | undefined;
  if (!command || !['indexes', 'migrate', 'seed'].includes(command)) {
    throw new Error('Expected one command: indexes, migrate, or seed');
  }
  const app = await NestFactory.createApplicationContext(DatabaseCliModule, { logger: false });
  try {
    let result: unknown;
    if (command === 'indexes') {
      const drift = await app.get(IndexManagerService).createMissingIndexes();
      if (drift.length > 0) throw new Error(`Unresolved index drift: ${JSON.stringify(drift)}`);
      result = { status: 'ok', command, drift: [] };
    } else if (command === 'migrate') {
      result = { status: 'ok', command, migrations: await app.get(MigrationRunnerService).run(migrations) };
    } else {
      const environment = app.get(ConfigService).getOrThrow<string>('app.environment');
      const seeds = selectSeeds(environment);
      result = { status: 'ok', command, seeds: await app.get(SeedRunnerService).run(seeds) };
    }
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } finally {
    await app.close();
  }
}

function selectSeeds(environment: string): readonly Seed[] {
  if (environment === 'development') return [developmentSeed];
  if (environment === 'test') return [testSeed];
  throw new Error('Automatic seed execution is disabled in production');
}

void run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown database command error';
  process.stderr.write(`${JSON.stringify({ status: 'error', message })}\n`);
  process.exitCode = 1;
});
