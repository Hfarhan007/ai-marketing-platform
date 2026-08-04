import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { Types } from 'mongoose';
import type { KnowledgeSourceType } from './knowledge-connector.types.js';
@Injectable()
export class KnowledgeConnectorRepository {
  constructor(@InjectConnection() private readonly connection: Connection) {}
  create(input: {
    workspaceId: string;
    userId: string;
    type: KnowledgeSourceType;
    name: string;
    encryptedConfiguration: string;
    encryptedCredentials: string;
    allowedDomains: string[];
  }) {
    return this.connection
      .collection('knowledge_connector_connections')
      .insertOne({
        ...input,
        workspaceId: new Types.ObjectId(input.workspaceId),
        createdBy: new Types.ObjectId(input.userId),
        status: 'active',
        checkpoint: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
  }
  async getConnection(workspaceId: string, connectionId: string) {
    const value = await this.connection
      .collection('knowledge_connector_connections')
      .findOne({
        _id: new Types.ObjectId(connectionId),
        workspaceId: new Types.ObjectId(workspaceId),
        status: { $ne: 'deleted' },
      });
    if (!value) throw new NotFoundException('Knowledge connector connection not found');
    return value;
  }
  checkpoint(workspaceId: string, connectionId: string, checkpoint: string | null) {
    return this.connection
      .collection('knowledge_connector_connections')
      .updateOne(
        { _id: new Types.ObjectId(connectionId), workspaceId: new Types.ObjectId(workspaceId) },
        { $set: { checkpoint, lastSyncedAt: new Date(), updatedAt: new Date() } },
      );
  }
  deleteConnection(workspaceId: string, connectionId: string) {
    return this.connection
      .collection('knowledge_connector_connections')
      .updateOne(
        { _id: new Types.ObjectId(connectionId), workspaceId: new Types.ObjectId(workspaceId) },
        {
          $set: {
            status: 'deleted',
            encryptedConfiguration: null,
            encryptedCredentials: null,
            updatedAt: new Date(),
          },
        },
      );
  }
  reserveRun(input: { workspaceId: string; connectionId: string; idempotencyKey: string }) {
    return this.connection
      .collection('knowledge_connector_sync_runs')
      .findOneAndUpdate(
        {
          workspaceId: new Types.ObjectId(input.workspaceId),
          connectionId: new Types.ObjectId(input.connectionId),
          idempotencyKey: input.idempotencyKey,
        },
        {
          $setOnInsert: {
            workspaceId: new Types.ObjectId(input.workspaceId),
            connectionId: new Types.ObjectId(input.connectionId),
            idempotencyKey: input.idempotencyKey,
            status: 'running',
            discovered: 0,
            fetched: 0,
            unchanged: 0,
            deleted: 0,
            retries: 0,
            startedAt: new Date(),
            createdAt: new Date(),
          },
        },
        { upsert: true, returnDocument: 'after' },
      );
  }
  finishRun(workspaceId: string, runId: string, update: Record<string, unknown>) {
    return this.connection
      .collection('knowledge_connector_sync_runs')
      .updateOne(
        { _id: new Types.ObjectId(runId), workspaceId: new Types.ObjectId(workspaceId) },
        { $set: { ...update, completedAt: new Date() } },
      );
  }
  knownDocuments(workspaceId: string, connectionId: string) {
    return this.connection
      .collection('knowledge_connector_documents')
      .find({
        workspaceId: new Types.ObjectId(workspaceId),
        connectionId: new Types.ObjectId(connectionId),
        status: 'active',
      })
      .toArray();
  }
  document(workspaceId: string, connectionId: string, externalId: string) {
    return this.connection
      .collection('knowledge_connector_documents')
      .findOne({
        workspaceId: new Types.ObjectId(workspaceId),
        connectionId: new Types.ObjectId(connectionId),
        externalId,
      });
  }
  async upsertDocument(input: {
    workspaceId: string;
    connectionId: string;
    userId: string;
    externalId: string;
    revision: string;
    locator: string;
  }) {
    const source = await this.connection
      .collection('knowledge_sources')
      .findOneAndUpdate(
        {
          workspaceId: new Types.ObjectId(input.workspaceId),
          idempotencyKey: `connector:${input.connectionId}:${input.externalId}`,
        },
        {
          $setOnInsert: {
            workspaceId: new Types.ObjectId(input.workspaceId),
            name: input.locator.slice(0, 200),
            sourceType: 'external_api',
            sourceReference: input.locator,
            status: 'pending',
            idempotencyKey: `connector:${input.connectionId}:${input.externalId}`,
            collectionIds: [],
            trustLevel: 'untrusted',
            createdBy: new Types.ObjectId(input.userId),
            createdAt: new Date(),
          },
        },
        { upsert: true, returnDocument: 'after' },
      );
    await this.connection
      .collection('knowledge_connector_documents')
      .updateOne(
        {
          workspaceId: new Types.ObjectId(input.workspaceId),
          connectionId: new Types.ObjectId(input.connectionId),
          externalId: input.externalId,
        },
        {
          $set: {
            revision: input.revision,
            locator: input.locator,
            sourceId: source!._id,
            status: 'active',
            seenAt: new Date(),
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true },
      );
    return String(source!._id);
  }
  markDeleted(workspaceId: string, connectionId: string, externalId: string) {
    return this.connection
      .collection('knowledge_connector_documents')
      .findOneAndUpdate(
        {
          workspaceId: new Types.ObjectId(workspaceId),
          connectionId: new Types.ObjectId(connectionId),
          externalId,
          status: 'active',
        },
        { $set: { status: 'deleted', deletedAt: new Date() } },
        { returnDocument: 'after' },
      );
  }
}
