import { Processor, WorkerHost } from '@nestjs/bullmq';
import { ConflictException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Job } from 'bullmq';
import { Types, type Connection } from 'mongoose';
import { CUSTOM_FIELD_MIGRATION_QUEUE } from '../custom-field.service.js';
import type { CustomFieldEntity, CustomFieldType } from '../custom-field.types.js';

interface MigrationPayload {
  workspaceId: string;
  definitionId: string;
  entityType: CustomFieldEntity;
  fieldKey: string;
  sourceType: CustomFieldType;
  targetType: CustomFieldType;
  expectedVersion: number;
  actorId: string;
}
const COLLECTIONS: Record<CustomFieldEntity, string> = {
  contacts: 'contacts',
  companies: 'companies',
  leads: 'leads',
  deals: 'deals',
  tasks: 'tasks',
  appointments: 'appointments',
};

@Processor(CUSTOM_FIELD_MIGRATION_QUEUE)
export class CustomFieldMigrationProcessor extends WorkerHost {
  constructor(@InjectConnection() private readonly connection: Connection) {
    super();
  }
  async process(job: Job<MigrationPayload>) {
    const payload = job.data;
    if (!/^[a-z][a-z0-9_]{1,79}$/u.test(payload.fieldKey))
      throw new ConflictException('CUSTOM_FIELD_KEY_INVALID');
    const session = await this.connection.startSession();
    try {
      await session.withTransaction(async () => {
        const database = this.connection.db;
        if (!database) throw new Error('MongoDB connection unavailable');
        const definitions = database.collection('custom_field_definitions');
        const filter = {
          _id: new Types.ObjectId(payload.definitionId),
          workspaceId: new Types.ObjectId(payload.workspaceId),
          entityType: payload.entityType,
          fieldType: payload.sourceType,
          version: payload.expectedVersion,
          archived: false,
        };
        const definition = await definitions.findOne(filter, { session });
        if (!definition) {
          const completed = await definitions.findOne(
            {
              _id: new Types.ObjectId(payload.definitionId),
              workspaceId: new Types.ObjectId(payload.workspaceId),
              fieldType: payload.targetType,
              version: payload.expectedVersion + 1,
            },
            { session },
          );
          if (completed) return;
          throw new ConflictException('CUSTOM_FIELD_MIGRATION_STALE');
        }
        if (payload.sourceType === 'single_select' && payload.targetType === 'multi_select') {
          const path = `customFields.${payload.fieldKey}`;
          await database.collection(COLLECTIONS[payload.entityType]).updateMany(
            {
              workspaceId: new Types.ObjectId(payload.workspaceId),
              [path]: { $exists: true, $not: { $type: 'array' } },
            },
            [{ $set: { [path]: [`$${path}`] } }],
            { session },
          );
        }
        const versionHistory: unknown[] = [];
        if (Array.isArray(definition.versionHistory))
          for (const entry of definition.versionHistory) versionHistory.push(entry as unknown);
        const result = await definitions.updateOne(
          filter,
          {
            $set: {
              fieldType: payload.targetType,
              updatedBy: new Types.ObjectId(payload.actorId),
              updatedAt: new Date(),
              versionHistory: [
                ...versionHistory,
                {
                  version: payload.expectedVersion,
                  fieldType: payload.sourceType,
                  migratedTo: payload.targetType,
                  changedAt: new Date(),
                  changedBy: payload.actorId,
                  jobId: String(job.id),
                },
              ],
            },
            $inc: { version: 1 },
          },
          { session },
        );
        if (result.modifiedCount !== 1) throw new ConflictException('CUSTOM_FIELD_MIGRATION_STALE');
      });
      return { migrated: true };
    } finally {
      await session.endSession();
    }
  }
}
