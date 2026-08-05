import { createConnection, Schema, Types, type Connection, type Model } from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TenantAwareRepository } from '../src/common/repositories/tenant-aware.repository.js';
import { startMemoryReplicaSet, type MongoTestEnvironment } from './support/mongo-test-environment.js';

interface RecordShape { name: string; workspaceId: Types.ObjectId }
class Repository extends TenantAwareRepository<RecordShape> { constructor(model: Model<RecordShape>) { super(model); } }

const configuredUri = process.env.MONGODB_INTEGRATION_URI;
const runMemoryMongo = process.env.RUN_MEMORY_MONGO === 'true';
const describeWithReplicaSet = configuredUri || runMemoryMongo ? describe : describe.skip;

describeWithReplicaSet('repository integration with replica-set transactions', () => {
  let environment: MongoTestEnvironment;
  let connection: Connection;
  let repository: Repository;
  beforeAll(async () => {
    environment = configuredUri
      ? { uri: configuredUri, stop: () => Promise.resolve() }
      : await startMemoryReplicaSet();
    connection = await createConnection(environment.uri, { dbName: `test_${Date.now()}` }).asPromise();
    const schema = new Schema<RecordShape>({ workspaceId: { type: Schema.Types.ObjectId, required: true }, name: { type: String, required: true } });
    repository = new Repository(connection.model('TestRecord', schema));
  }, 60_000);
  afterAll(async () => { await connection?.dropDatabase(); await connection?.close(); await environment?.stop(); });

  it('rolls back all writes when a transaction fails', async () => {
    const session = await connection.startSession();
    await expect(session.withTransaction(async () => {
      await connection.collection('testrecords').insertOne({ workspaceId: new Types.ObjectId(), name: 'must rollback' }, { session });
      throw new Error('force rollback');
    })).rejects.toThrow('force rollback');
    await session.endSession();
    await expect(connection.collection('testrecords').countDocuments()).resolves.toBe(0);
  });

  it('enforces tenant isolation in the database operation', async () => {
    const owner = new Types.ObjectId();
    const attacker = new Types.ObjectId();
    const inserted = await connection.collection<RecordShape>('testrecords').insertOne({ workspaceId: owner, name: 'private' });
    await expect(repository.findOne(attacker.toHexString(), { _id: inserted.insertedId })).resolves.toBeNull();
    await expect(repository.findOne(owner.toHexString(), { _id: inserted.insertedId })).resolves.toMatchObject({ name: 'private' });
  });
});
