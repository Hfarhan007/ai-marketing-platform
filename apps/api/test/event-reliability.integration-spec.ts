import { randomUUID } from 'node:crypto';
import { createConnection, Schema, Types, type Connection } from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const integrationUri = process.env.MONGODB_INTEGRATION_URI ?? '';
const describeWithMongo = integrationUri ? describe : describe.skip;
describeWithMongo('transactional event reliability (integration)', () => {
  let connection!: Connection;
  beforeAll(async () => {
    connection = await createConnection(integrationUri, {
      dbName: `ai_marketing_events_${Date.now()}`,
      serverSelectionTimeoutMS: 5000,
    }).asPromise();
  });
  afterAll(async () => {
    await connection.dropDatabase();
    await connection.close();
  });
  it('recovers an outbox event after a crash between commit and publication', async () => {
    const business = connection.model(
      'CrashProbe',
      new Schema({ workspaceId: Schema.Types.ObjectId, state: String }),
      'crash_probes',
    );
    const outbox = connection.model(
      'OutboxProbe',
      new Schema({
        eventId: { type: String, unique: true },
        workspaceId: Schema.Types.ObjectId,
        status: String,
        availableAt: Date,
        payload: Schema.Types.Mixed,
      }),
      'outbox_events',
    );
    await Promise.all([business.createCollection(), outbox.createCollection()]);
    await outbox.createIndexes();
    const workspaceId = new Types.ObjectId(),
      eventId = randomUUID(),
      session = await connection.startSession();
    await session.withTransaction(async () => {
      await business.create([{ workspaceId, state: 'committed' }], { session });
      await outbox.create(
        [
          {
            eventId,
            workspaceId,
            status: 'pending',
            availableAt: new Date(),
            payload: { state: 'committed' },
          },
        ],
        { session },
      );
    });
    await session.endSession();
    // The process "crashes" here: no queue publication or processed marker occurs.
    await connection.close();
    connection = await createConnection(integrationUri, {
      dbName: connection.name,
      serverSelectionTimeoutMS: 5000,
    }).asPromise();
    const recoveredBusiness = connection.model('CrashProbe', business.schema, 'crash_probes'),
      recoveredOutbox = connection.model('OutboxProbe', outbox.schema, 'outbox_events');
    expect(await recoveredBusiness.countDocuments({ workspaceId, state: 'committed' })).toBe(1);
    expect(await recoveredOutbox.findOne({ eventId, status: 'pending' }).lean()).toBeTruthy();
  });
  it('atomically claims one inbox record per consumer and event', async () => {
    const inbox = connection.model(
      'InboxProbe',
      new Schema({
        consumerName: String,
        eventId: String,
        workspaceId: Schema.Types.ObjectId,
        status: String,
      }),
      'inbox_events',
    );
    await inbox.collection.createIndex({ consumerName: 1, eventId: 1 }, { unique: true });
    const value = {
      consumerName: 'analytics',
      eventId: randomUUID(),
      workspaceId: new Types.ObjectId(),
      status: 'processing',
    };
    const settled = await Promise.allSettled([inbox.create(value), inbox.create(value)]);
    expect(settled.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(settled.filter((result) => result.status === 'rejected')).toHaveLength(1);
  });
});
