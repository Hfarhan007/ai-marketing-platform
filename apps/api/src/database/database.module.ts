import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { IndexManagerService } from './indexes/index-manager.service.js';
import { MigrationRunnerService } from './migrations/migration-runner.service.js';
import { MigrationState, MigrationStateSchema } from './migrations/migration-state.schema.js';
import { MongoModule } from './mongo/mongo.module.js';
import { SeedRunnerService } from './seeds/seed-runner.service.js';
import { TransactionManagerService } from './transactions/transaction-manager.service.js';
import { AtlasVectorIndexManagerService } from './indexes/atlas-vector-index-manager.service.js';

@Module({
  imports: [
    MongoModule,
    MongooseModule.forFeature([{ name: MigrationState.name, schema: MigrationStateSchema }]),
  ],
  providers: [
    IndexManagerService,
    MigrationRunnerService,
    SeedRunnerService,
    TransactionManagerService,
    AtlasVectorIndexManagerService,
  ],
  exports: [
    MongoModule,
    MongooseModule,
    IndexManagerService,
    MigrationRunnerService,
    SeedRunnerService,
    TransactionManagerService,
    AtlasVectorIndexManagerService,
  ],
})
export class DatabaseModule {}
