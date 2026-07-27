import { describe, expect, it, vi } from 'vitest';
import { MongoConnection } from '../mongo/mongo.connection.js';
import { INDEX_DEFINITIONS, workspaceIndex } from './index-definitions.js';
import { IndexManagerService } from './index-manager.service.js';

describe('explicit index definitions', () => {
  it('uses globally unique collection/name pairs', () => {
    const identities = INDEX_DEFINITIONS.map(
      (definition) => `${definition.collection}:${definition.name}`,
    );
    expect(new Set(identities).size).toBe(identities.length);
    expect(INDEX_DEFINITIONS.every((definition) => Object.keys(definition.keys).length > 0)).toBe(
      true,
    );
  });

  it('places workspaceId first in tenant-scoped indexes', () => {
    const definition = workspaceIndex('contacts', { email: 1 }, 'workspace_email');
    expect(Object.keys(definition.keys)).toEqual(['workspaceId', 'email']);
  });

  it('reports mismatched and unexpected indexes without deleting them', async () => {
    const dropIndex = vi.fn();
    const native = {
      collection: vi.fn().mockReturnValue({
        listIndexes: () => ({
          toArray: vi.fn().mockResolvedValue([
            { name: '_id_', key: { _id: 1 } },
            { name: 'workspace_email', key: { workspaceId: 1, email: -1 } },
            { name: 'legacy', key: { legacy: 1 } },
          ]),
        }),
        dropIndex,
      }),
    };
    const manager = new IndexManagerService({ native } as unknown as MongoConnection);
    const expected = [workspaceIndex('contacts', { email: 1 }, 'workspace_email')];

    await expect(manager.detectDrift(expected)).resolves.toEqual([
      { collection: 'contacts', index: 'workspace_email', kind: 'mismatched' },
      { collection: 'contacts', index: 'legacy', kind: 'unexpected' },
    ]);
    expect(dropIndex).not.toHaveBeenCalled();
  });
});
