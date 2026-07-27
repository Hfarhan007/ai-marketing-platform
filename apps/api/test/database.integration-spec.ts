import {
  createConnection,
  Schema,
  Types,
  type Connection,
  type Model,
} from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TenantAwareRepository } from '../src/common/repositories/tenant-aware.repository.js';

const integrationUri = process.env.MONGODB_INTEGRATION_URI ?? '';
const describeWithMongo = integrationUri ? describe : describe.skip;

interface TenantProbe {
  workspaceId: Types.ObjectId;
  name: string;
}

class TenantProbeRepository extends TenantAwareRepository<TenantProbe> {
  constructor(model: Model<TenantProbe>) {
    super(model);
  }
}

describeWithMongo('MongoDB foundation (integration)', () => {
  let connection!: Connection;
  let tenantRepository!: TenantProbeRepository;

  beforeAll(async () => {
    const database = `ai_marketing_integration_${Date.now()}`;
    connection = await createConnection(integrationUri, {
      dbName: database,
      autoIndex: false,
      serverSelectionTimeoutMS: 5_000,
    }).asPromise();
    const tenantProbeSchema = new Schema<TenantProbe>({
      workspaceId: { type: Schema.Types.ObjectId, required: true },
      name: { type: String, required: true },
    });
    tenantRepository = new TenantProbeRepository(
      connection.model<TenantProbe>('TenantProbe', tenantProbeSchema, 'tenant_probe'),
    );
  });

  afterAll(async () => {
    await connection.dropDatabase();
    await connection.close();
  });

  it('creates an explicit unique index', async () => {
    const collection = connection.collection('index_probe');
    await collection.createIndex({ workspaceId: 1, externalId: 1 }, {
      name: 'workspace_external_id_unique',
      unique: true,
    });
    const indexes: unknown = await collection.listIndexes().toArray();
    expect(hasNamedIndex(indexes, 'workspace_external_id_unique')).toBe(true);
  });

  it('commits a replica-set transaction', async () => {
    const session = await connection.startSession();
    try {
      await session.withTransaction(async () => {
        await connection.collection('transaction_probe').insertOne(
          { marker: 'committed', createdAt: new Date() },
          { session },
        );
      });
    } finally {
      await session.endSession();
    }
    await expect(
      connection.collection('transaction_probe').countDocuments({ marker: 'committed' }),
    ).resolves.toBe(1);
  });

  it('blocks cross-workspace reads, updates, and deletes in the repository', async () => {
    const workspaceA = new Types.ObjectId();
    const workspaceB = new Types.ObjectId();
    const collection = connection.collection<TenantProbe>('tenant_probe');
    const inserted = await collection.insertOne({ workspaceId: workspaceB, name: 'private' });

    await expect(
      tenantRepository.findOne(workspaceA.toHexString(), { _id: inserted.insertedId }),
    ).resolves.toBeNull();
    await expect(
      tenantRepository.updateOne(
        workspaceA.toHexString(),
        { _id: inserted.insertedId },
        { $set: { name: 'compromised' } },
      ),
    ).resolves.toBeNull();
    await expect(
      tenantRepository.deleteOne(workspaceA.toHexString(), { _id: inserted.insertedId }),
    ).resolves.toBe(false);
    await expect(collection.findOne({ _id: inserted.insertedId })).resolves.toMatchObject({
      workspaceId: workspaceB,
      name: 'private',
    });
  });
});

function hasNamedIndex(value: unknown, name: string): boolean {
  if (!Array.isArray(value)) return false;
  const indexes: unknown[] = value;
  return indexes.some((index: unknown) => {
    if (typeof index !== 'object' || index === null) return false;
    return (index as Record<string, unknown>).name === name;
  });
}
