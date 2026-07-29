import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoConnection } from './mongo.connection.js';
import { MongoHealthIndicator } from './mongo.health.js';
import { createMongoOptions } from './mongo.options.js';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const database = config.get<string>('database.database');
        return createMongoOptions({
          uri: config.getOrThrow<string>('database.uri'),
          environment: config.getOrThrow<string>('app.environment'),
          ...(database ? { database } : {}),
          databasePrefix: config.getOrThrow<string>('database.databasePrefix'),
          minPoolSize: config.getOrThrow<number>('database.minPoolSize'),
          maxPoolSize: config.getOrThrow<number>('database.maxPoolSize'),
          maxConnecting: config.getOrThrow<number>('database.maxConnecting'),
          maxIdleTimeMs: config.getOrThrow<number>('database.maxIdleTimeMs'),
          waitQueueTimeoutMs: config.getOrThrow<number>('database.waitQueueTimeoutMs'),
          serverSelectionTimeoutMs: config.getOrThrow<number>('database.serverSelectionTimeoutMs'),
          socketTimeoutMs: config.getOrThrow<number>('database.socketTimeoutMs'),
        });
      },
    }),
  ],
  providers: [MongoConnection, MongoHealthIndicator],
  exports: [MongooseModule, MongoConnection, MongoHealthIndicator],
})
export class MongoModule {}
