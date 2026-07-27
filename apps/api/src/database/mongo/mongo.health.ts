import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { HealthIndicatorService, type HealthIndicatorResult } from '@nestjs/terminus';
import type { Connection } from 'mongoose';

@Injectable()
export class MongoHealthIndicator {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly indicator: HealthIndicatorService,
  ) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const check = this.indicator.check(key);
    try {
      if (!this.connection.db) throw new Error('MongoDB connection is not initialized');
      await this.connection.db.admin().ping();
      return check.up({ database: this.connection.name });
    } catch (error: unknown) {
      return check.down({ message: error instanceof Error ? error.message : 'MongoDB unavailable' });
    }
  }
}
