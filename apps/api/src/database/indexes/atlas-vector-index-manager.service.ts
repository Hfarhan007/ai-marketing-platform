import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongoConnection } from '../mongo/mongo.connection.js';
import type { AtlasVectorIndexDefinition } from './vector-index-definitions.js';

export interface VectorIndexHealth {
  name: string;
  status: string;
  queryable: boolean;
  ready: boolean;
}

@Injectable()
export class AtlasVectorIndexManagerService {
  private readonly versionsCollection = 'knowledge_vector_index_versions';
  constructor(
    private readonly mongo: MongoConnection,
    private readonly config: ConfigService,
  ) {}

  async deploy(definition: AtlasVectorIndexDefinition) {
    this.assertAtlas();
    const existing = await this.health(definition.collection, definition.name);
    if (!existing) {
      if (!this.mongo.native.db) throw new Error('MongoDB connection is not ready');
      await this.mongo.native.db.command({
        createSearchIndexes: definition.collection,
        indexes: [
          { name: definition.name, type: 'vectorSearch', definition: definition.definition },
        ],
      });
    }
    await this.mongo.native.collection(this.versionsCollection).updateOne(
      { name: definition.name },
      {
        $set: {
          environment: this.environment(),
          collection: definition.collection,
          version: definition.version,
          dimensions: definition.dimensions,
          definition: definition.definition,
          status: existing?.ready ? 'ready' : 'deploying',
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true },
    );
    return this.health(definition.collection, definition.name);
  }

  async health(collection: string, name: string): Promise<VectorIndexHealth | null> {
    this.assertAtlas();
    const values = await this.mongo.native
      .collection(collection)
      .aggregate<Record<string, unknown>>([{ $listSearchIndexes: { name } }])
      .toArray();
    const value = values[0];
    if (!value) return null;
    const status = (typeof value.status === 'string' ? value.status : 'UNKNOWN').toUpperCase();
    const queryable = value.queryable === true || status === 'READY';
    return { name, status, queryable, ready: status === 'READY' && queryable };
  }

  async waitUntilReady(
    definition: AtlasVectorIndexDefinition,
    timeoutMs = 300_000,
    pollMs = 5_000,
  ) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const health = await this.health(definition.collection, definition.name);
      if (health?.ready) {
        await this.mongo.native
          .collection(this.versionsCollection)
          .updateOne(
            { name: definition.name },
            { $set: { status: 'ready', readyAt: new Date(), updatedAt: new Date() } },
          );
        return health;
      }
      await new Promise((resolve) => setTimeout(resolve, Math.min(pollMs, timeoutMs)));
    }
    throw new Error(`Atlas vector index ${definition.name} did not become ready`);
  }

  async activate(definition: AtlasVectorIndexDefinition) {
    const health = await this.health(definition.collection, definition.name);
    if (!health?.ready) throw new Error(`Atlas vector index ${definition.name} is not ready`);
    const collection = this.mongo.native.collection(this.versionsCollection);
    await collection.updateMany(
      { environment: this.environment(), collection: definition.collection, status: 'active' },
      { $set: { status: 'superseded', updatedAt: new Date() } },
    );
    await collection.updateOne(
      { name: definition.name },
      { $set: { status: 'active', activatedAt: new Date(), updatedAt: new Date() } },
      { upsert: false },
    );
    return definition.name;
  }

  private environment() {
    return this.config.get<string>('app.environment') ?? 'development';
  }
  private assertAtlas() {
    const uri = this.config.get<string>('database.uri') ?? '';
    if (!/^mongodb\+srv:\/\//u.test(uri) && this.environment() === 'production')
      throw new Error('Atlas Vector Search requires an Atlas mongodb+srv connection');
  }
}
