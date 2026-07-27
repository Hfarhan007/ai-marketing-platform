import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { aiConfig } from './ai.config.js';
import { appConfig } from './app.config.js';
import { authConfig } from './auth.config.js';
import { databaseConfig } from './database.config.js';
import { validateEnvironment } from './environment.schema.js';
import { integrationsConfig } from './integrations.config.js';
import { redisConfig } from './redis.config.js';
import { storageConfig } from './storage.config.js';

@Module({
  imports: [ConfigModule.forRoot({
    cache: true,
    expandVariables: true,
    isGlobal: true,
    load: [appConfig, databaseConfig, redisConfig, authConfig, storageConfig, aiConfig, integrationsConfig],
    validate: validateEnvironment,
  })],
})
export class ConfigurationModule {}
