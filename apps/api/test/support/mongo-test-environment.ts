import { MongoMemoryReplSet, MongoMemoryServer } from 'mongodb-memory-server';
import { MongoDBContainer, type StartedMongoDBContainer } from '@testcontainers/mongodb';

export interface MongoTestEnvironment { stop(): Promise<void>; uri: string }

export async function startMemoryMongo(): Promise<MongoTestEnvironment> {
  const server = await MongoMemoryServer.create();
  return { uri: server.getUri(), stop: () => server.stop().then(() => undefined) };
}

export async function startMemoryReplicaSet(): Promise<MongoTestEnvironment> {
  const server = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  return { uri: server.getUri(), stop: () => server.stop().then(() => undefined) };
}

/** Docker-backed MongoDB for CI tests that must validate the production server binary. */
export async function startMongoContainer(): Promise<MongoTestEnvironment> {
  const container: StartedMongoDBContainer = await new MongoDBContainer('mongo:8.0').start();
  return { uri: container.getConnectionString(), stop: () => container.stop().then(() => undefined) };
}
