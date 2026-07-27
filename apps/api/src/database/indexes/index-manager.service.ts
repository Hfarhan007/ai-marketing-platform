import { Injectable } from '@nestjs/common';
import { MongoConnection } from '../mongo/mongo.connection.js';
import { INDEX_DEFINITIONS, type ExplicitIndexDefinition } from './index-definitions.js';

export type IndexDriftKind = 'missing' | 'mismatched' | 'unexpected';

export interface IndexDrift {
  collection: string;
  index: string;
  kind: IndexDriftKind;
}

interface ListedIndex {
  name?: string;
  key?: Record<string, unknown>;
  unique?: boolean;
  sparse?: boolean;
}

@Injectable()
export class IndexManagerService {
  constructor(private readonly mongo: MongoConnection) {}

  async detectDrift(
    definitions: readonly ExplicitIndexDefinition[] = INDEX_DEFINITIONS,
  ): Promise<IndexDrift[]> {
    const grouped = this.groupByCollection(definitions);
    const drift: IndexDrift[] = [];
    for (const [collectionName, expected] of grouped) {
      const actual = await this.listIndexes(collectionName);
      const actualByName = new Map(actual.map((index) => [index.name, index]));
      for (const definition of expected) {
        const index = actualByName.get(definition.name);
        if (!index) {
          drift.push({ collection: collectionName, index: definition.name, kind: 'missing' });
        } else if (!this.matches(definition, index)) {
          drift.push({ collection: collectionName, index: definition.name, kind: 'mismatched' });
        }
      }
      const expectedNames = new Set(expected.map((definition) => definition.name));
      for (const index of actual) {
        if (index.name !== '_id_' && index.name && !expectedNames.has(index.name)) {
          drift.push({ collection: collectionName, index: index.name, kind: 'unexpected' });
        }
      }
    }
    return drift;
  }

  async createMissingIndexes(
    definitions: readonly ExplicitIndexDefinition[] = INDEX_DEFINITIONS,
  ): Promise<IndexDrift[]> {
    const drift = await this.detectDrift(definitions);
    const missing = drift.filter((item) => item.kind === 'missing');
    for (const item of missing) {
      const definition = definitions.find(
        (candidate) => candidate.collection === item.collection && candidate.name === item.index,
      );
      if (definition) {
        await this.mongo.native
          .collection(definition.collection)
          .createIndex(definition.keys, { ...definition.options, name: definition.name });
      }
    }
    return this.detectDrift(definitions);
  }

  private groupByCollection(
    definitions: readonly ExplicitIndexDefinition[],
  ): Map<string, ExplicitIndexDefinition[]> {
    const grouped = new Map<string, ExplicitIndexDefinition[]>();
    for (const definition of definitions) {
      const collection = grouped.get(definition.collection) ?? [];
      collection.push(definition);
      grouped.set(definition.collection, collection);
    }
    return grouped;
  }

  private async listIndexes(collectionName: string): Promise<ListedIndex[]> {
    try {
      const indexes: unknown = await this.mongo.native
        .collection(collectionName)
        .listIndexes()
        .toArray();
      if (!Array.isArray(indexes)) throw new Error('MongoDB returned an invalid index list');
      return indexes.map((index) => this.toListedIndex(index));
    } catch (error: unknown) {
      if (this.isNamespaceMissing(error)) return [];
      throw error;
    }
  }

  private toListedIndex(value: unknown): ListedIndex {
    if (typeof value !== 'object' || value === null) {
      throw new Error('MongoDB returned an invalid index definition');
    }
    const candidate = value as Record<string, unknown>;
    return {
      ...(typeof candidate.name === 'string' ? { name: candidate.name } : {}),
      ...(typeof candidate.key === 'object' && candidate.key !== null
        ? { key: candidate.key as Record<string, unknown> }
        : {}),
      ...(typeof candidate.unique === 'boolean' ? { unique: candidate.unique } : {}),
      ...(typeof candidate.sparse === 'boolean' ? { sparse: candidate.sparse } : {}),
    };
  }

  private isNamespaceMissing(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 26;
  }

  private matches(expected: ExplicitIndexDefinition, actual: ListedIndex): boolean {
    const expectedKeys = Object.entries(expected.keys);
    const actualKeys = actual.key ? Object.entries(actual.key) : [];
    return (
      JSON.stringify(expectedKeys) === JSON.stringify(actualKeys) &&
      Boolean(expected.options?.unique) === Boolean(actual.unique) &&
      (expected.options?.sparse === undefined ||
        Boolean(expected.options.sparse) === Boolean(actual.sparse))
    );
  }
}
