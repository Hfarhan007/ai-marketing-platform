import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import type { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import type { Connection, Model } from 'mongoose';
import { Types } from 'mongoose';
import { REDIS_CLIENT } from '../../../cache/redis.constants.js';
import { StorageProviderRegistry } from '../../files/storage/storage.providers.js';
import {
  DATA_CLASSES,
  DATA_COLLECTIONS,
  PLATFORM_POLICY_LIMITS,
  retryableStages,
  type DataClass,
  type LifecycleJob,
  type ManifestStage,
} from '../data-lifecycle.types.js';
import {
  DataDeletionManifest,
  DataLegalHold,
  DataLifecyclePolicy,
  DataLifecycleRecord,
} from '../schemas/data-lifecycle.schemas.js';

export const DATA_LIFECYCLE_QUEUE = 'data-lifecycle';
const DAY = 86_400_000;
type ManifestEntry = {
  dataClass: DataClass;
  collection: string;
  recordId: string;
  mode: 'anonymize' | 'hard_delete';
  storageKeys: string[];
  stages: Record<ManifestStage, 'pending' | 'completed' | 'failed' | 'not_applicable'>;
  errors: Partial<Record<ManifestStage, string>>;
};

@Injectable()
export class DataLifecycleRepository {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(DataLifecyclePolicy.name) private readonly policies: Model<DataLifecyclePolicy>,
    @InjectModel(DataLegalHold.name) private readonly holds: Model<DataLegalHold>,
    @InjectModel(DataDeletionManifest.name)
    private readonly manifests: Model<DataDeletionManifest>,
    @InjectModel(DataLifecycleRecord.name) private readonly records: Model<DataLifecycleRecord>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly storageRegistry: StorageProviderRegistry,
    @InjectQueue(DATA_LIFECYCLE_QUEUE) private readonly queue: Queue<LifecycleJob>,
  ) {}

  listPolicies(workspaceId: string) {
    return this.policies.find({ workspaceId: new Types.ObjectId(workspaceId) }).lean().exec();
  }

  async scheduleAll(dryRun = false) {
    const workspaces = await this.connection
      .collection('workspaces')
      .find({ status: { $in: ['active', 'suspended', 'archived'] } })
      .project({ _id: 1, ownerId: 1 })
      .toArray();
    const day = new Date().toISOString().slice(0, 10);
    for (const workspace of workspaces)
      await this.schedule(
        String(workspace._id),
        String(workspace.ownerId),
        dryRun,
        `scheduled:${day}:${dryRun ? 'dry' : 'live'}`,
      );
    return { scheduled: workspaces.length };
  }

  async updatePolicy(
    workspaceId: string,
    actorId: string,
    input: {
      dataClass: DataClass;
      retentionDays: number;
      recoveryDays?: number;
      deletionMode?: 'anonymize' | 'hard_delete';
      enabled?: boolean;
    },
  ) {
    const limits = PLATFORM_POLICY_LIMITS[input.dataClass];
    if (input.retentionDays < limits.minDays || input.retentionDays > limits.maxDays)
      throw new BadRequestException(
        `Retention for ${input.dataClass} must be ${limits.minDays}-${limits.maxDays} days`,
      );
    const recoveryDays = input.recoveryDays ?? limits.recoveryDays;
    if (recoveryDays > limits.recoveryDays)
      throw new BadRequestException(`Recovery period cannot exceed ${limits.recoveryDays} days`);
    if (input.deletionMode && input.deletionMode !== limits.mode)
      throw new BadRequestException(`Deletion mode for ${input.dataClass} is fixed by platform policy`);
    return this.policies
      .findOneAndUpdate(
        { workspaceId: new Types.ObjectId(workspaceId), dataClass: input.dataClass },
        {
          $set: {
            retentionDays: input.retentionDays,
            recoveryDays,
            deletionMode: limits.mode,
            enabled: input.enabled ?? true,
            updatedBy: new Types.ObjectId(actorId),
          },
        },
        { upsert: true, new: true },
      )
      .lean()
      .exec();
  }

  async createHold(
    workspaceId: string,
    actorId: string,
    input: { dataClass: DataClass; recordId?: string; reason: string },
  ) {
    return new this.holds({
      workspaceId: new Types.ObjectId(workspaceId),
      dataClass: input.dataClass,
      recordId: input.recordId ?? null,
      reason: input.reason,
      effectiveAt: new Date(),
      releasedAt: null,
      createdBy: new Types.ObjectId(actorId),
    }).save();
  }

  releaseHold(workspaceId: string, holdId: string) {
    return this.holds
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(holdId),
          workspaceId: new Types.ObjectId(workspaceId),
          releasedAt: null,
        },
        { $set: { releasedAt: new Date() } },
        { new: true },
      )
      .lean()
      .exec();
  }

  async schedule(
    workspaceId: string,
    requestedBy: string,
    dryRun: boolean,
    idempotencyKey: string,
  ) {
    let manifest = await this.manifests
      .findOne({ workspaceId: new Types.ObjectId(workspaceId), idempotencyKey })
      .lean<DataDeletionManifest>()
      .exec();
    if (!manifest) {
      try {
        manifest = (
          await new this.manifests({
            workspaceId: new Types.ObjectId(workspaceId),
            idempotencyKey,
            dryRun,
            status: 'planned',
            entries: [],
            history: [{ at: new Date(), action: 'scheduled', actor: requestedBy, dryRun }],
            requestedBy: new Types.ObjectId(requestedBy),
          }).save()
        ).toObject();
      } catch (error) {
        if (!this.isDuplicate(error)) throw error;
        manifest = await this.manifests
          .findOne({ workspaceId: new Types.ObjectId(workspaceId), idempotencyKey })
          .lean<DataDeletionManifest>()
          .orFail()
          .exec();
      }
    }
    await this.queue.add(
      'data-lifecycle.execute',
      { workspaceId, requestedBy, dryRun, manifestId: String(manifest._id) },
      {
        jobId: `lifecycle-${String(manifest._id)}-attempt-${manifest.attempts}`,
        attempts: 5,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: 1_000,
        removeOnFail: false,
      },
    );
    return manifest;
  }

  async execute(manifestId: string, workspaceId: string) {
    let manifest = await this.manifests
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(manifestId),
          workspaceId: new Types.ObjectId(workspaceId),
          status: { $ne: 'completed' },
        },
        {
          $set: { status: 'running', lastError: null },
          $inc: { attempts: 1 },
          $push: { history: { at: new Date(), action: 'execution_started' } },
        },
        { new: true },
      )
      .lean<DataDeletionManifest>()
      .exec();
    if (!manifest) return this.getManifest(workspaceId, manifestId);
    if (!manifest.entries.length) {
      const entries = await this.plan(workspaceId);
      manifest =
        (await this.manifests
          .findByIdAndUpdate(manifest._id, { $set: { entries } }, { new: true })
          .lean<DataDeletionManifest>()
          .exec()) ?? manifest;
    }
    if (manifest.dryRun)
      return this.finish(manifest, 'completed', {
        action: 'dry_run_completed',
        candidates: manifest.entries.length,
      });

    let failed = false;
    for (let index = 0; index < manifest.entries.length; index += 1) {
      const entry = manifest.entries[index] as ManifestEntry;
      if (await this.isHeld(workspaceId, entry.dataClass, entry.recordId)) {
        await this.updateEntry(manifest._id, index, {
          'stages.object_storage': 'not_applicable',
          'stages.vector_index': 'not_applicable',
          'stages.cache': 'not_applicable',
          'stages.mongodb': 'not_applicable',
        });
        continue;
      }
      for (const stage of retryableStages(entry.stages)) {
        try {
          await this.runStage(workspaceId, entry, stage);
          await this.updateEntry(manifest._id, index, { [`stages.${stage}`]: 'completed' });
          entry.stages[stage] = 'completed';
        } catch (error) {
          failed = true;
          const message = error instanceof Error ? error.message.slice(0, 1_000) : String(error);
          await this.updateEntry(manifest._id, index, {
            [`stages.${stage}`]: 'failed',
            [`errors.${stage}`]: message,
          });
          break;
        }
      }
    }
    const current = await this.manifests.findById(manifest._id).lean<DataDeletionManifest>().orFail();
    if (failed) {
      await this.finish(current, 'partial_failure', { action: 'partial_failure' });
      throw new Error(`Lifecycle manifest ${manifestId} has partially failed stages`);
    }
    return this.finish(current, 'completed', { action: 'deletion_completed' });
  }

  getManifest(workspaceId: string, manifestId: string) {
    return this.manifests
      .findOne({ _id: new Types.ObjectId(manifestId), workspaceId: new Types.ObjectId(workspaceId) })
      .lean()
      .exec();
  }

  async retry(workspaceId: string, manifestId: string, actorId: string) {
    const manifest = await this.getManifest(workspaceId, manifestId);
    if (!manifest || !['partial_failure', 'failed'].includes(manifest.status))
      throw new ConflictException('Manifest is not retryable');
    await this.manifests.updateOne(
      { _id: manifest._id },
      {
        $set: { status: 'planned' },
        $push: { history: { at: new Date(), action: 'operator_retry', actor: actorId } },
      },
    );
    await this.queue.add(
      'data-lifecycle.execute',
      { manifestId, workspaceId, dryRun: manifest.dryRun, requestedBy: actorId },
      { jobId: `lifecycle-${manifestId}-attempt-${manifest.attempts}`, attempts: 5 },
    );
    return this.getManifest(workspaceId, manifestId);
  }

  async restore(workspaceId: string, dataClass: DataClass, recordId: string) {
    const record = await this.records
      .findOne({
        workspaceId: new Types.ObjectId(workspaceId),
        dataClass,
        recordId,
        state: 'soft_deleted',
        recoveryUntil: { $gt: new Date() },
      })
      .lean<DataLifecycleRecord>()
      .exec();
    if (!record) throw new NotFoundException('No restorable record in its recovery period');
    if (await this.isHeld(workspaceId, dataClass, recordId))
      throw new ConflictException('Record is under legal hold');
    for (const collection of DATA_COLLECTIONS[dataClass])
      await this.connection.collection(collection).updateOne(
        {
          $and: [
            { _id: this.identifier(recordId) },
            await this.scopeFilter(workspaceId, dataClass),
          ],
        },
        { $set: { deletedAt: null, lifecycleState: 'active' }, $unset: { scheduledDeletionAt: '' } },
      );
    await this.records.updateOne({ _id: record._id }, { $set: { state: 'active' } });
    return { restored: true };
  }

  async scheduleDeletion(workspaceId: string, dataClass: DataClass, recordId: string) {
    if (await this.isHeld(workspaceId, dataClass, recordId))
      throw new ConflictException('Record is under legal hold');
    const configured = await this.policies
      .findOne({ workspaceId: new Types.ObjectId(workspaceId), dataClass })
      .lean<DataLifecyclePolicy>()
      .exec();
    const recoveryDays =
      configured?.recoveryDays ?? PLATFORM_POLICY_LIMITS[dataClass].recoveryDays;
    if (recoveryDays === 0)
      throw new ConflictException(`${dataClass} does not support restoration`);
    const now = new Date();
    const recoveryUntil = new Date(now.valueOf() + recoveryDays * DAY);
    let matched = 0;
    for (const collection of DATA_COLLECTIONS[dataClass]) {
      const result = await this.connection.collection(collection).updateOne(
        {
          $and: [
            { _id: this.identifier(recordId) },
            await this.scopeFilter(workspaceId, dataClass),
          ],
        },
        {
          $set: {
            deletedAt: now,
            lifecycleState: 'soft_deleted',
            scheduledDeletionAt: recoveryUntil,
          },
        },
      );
      matched += result.matchedCount;
    }
    if (!matched) throw new NotFoundException('Lifecycle record not found');
    await this.records.updateOne(
      { workspaceId: new Types.ObjectId(workspaceId), dataClass, recordId },
      {
        $set: {
          state: 'soft_deleted',
          scheduledDeletionAt: recoveryUntil,
          recoveryUntil,
          deletedAt: now,
        },
      },
      { upsert: true },
    );
    return { state: 'soft_deleted', recoveryUntil };
  }

  private async plan(workspaceId: string): Promise<ManifestEntry[]> {
    const configured = await this.policies
      .find({ workspaceId: new Types.ObjectId(workspaceId), enabled: true })
      .lean<DataLifecyclePolicy[]>()
      .exec();
    const policyMap = new Map(configured.map((policy) => [policy.dataClass, policy]));
    const entries: ManifestEntry[] = [];
    for (const dataClass of DATA_CLASSES) {
      const limit = PLATFORM_POLICY_LIMITS[dataClass];
      const policy = policyMap.get(dataClass);
      const retentionDays = policy?.retentionDays ?? limit.defaultDays;
      const cutoff = new Date(Date.now() - retentionDays * DAY);
      for (const collection of DATA_COLLECTIONS[dataClass]) {
        const filter = await this.scopeFilter(workspaceId, dataClass);
        const candidates = await this.connection
          .collection(collection)
          .find({ ...filter, ...this.expiredFilter(dataClass, cutoff) })
          .project({ _id: 1, storageKey: 1, resultStorageKey: 1, errorReportStorageKey: 1 })
          .limit(10_000)
          .toArray();
        for (const candidate of candidates) {
          const recordId = String(candidate._id);
          if (await this.isHeld(workspaceId, dataClass, recordId)) continue;
          const storageKeys = [
            candidate.storageKey,
            candidate.resultStorageKey,
            candidate.errorReportStorageKey,
          ].filter((value): value is string => typeof value === 'string' && Boolean(value));
          entries.push({
            dataClass,
            collection,
            recordId,
            mode: (policy?.deletionMode ?? limit.mode) as 'anonymize' | 'hard_delete',
            storageKeys,
            stages: {
              object_storage: storageKeys.length ? 'pending' : 'not_applicable',
              vector_index:
                dataClass === 'knowledge_documents' ? 'pending' : 'not_applicable',
              cache: 'pending',
              mongodb: 'pending',
            },
            errors: {},
          });
        }
      }
    }
    return entries;
  }

  private async runStage(
    workspaceId: string,
    entry: ManifestEntry,
    stage: ManifestStage,
  ): Promise<void> {
    if (stage === 'object_storage') {
      const storage = this.storageRegistry.get();
      for (const key of entry.storageKeys) await storage.delete(key);
      return;
    }
    if (stage === 'vector_index') {
      await Promise.all([
        this.connection
          .collection('knowledge_embeddings')
          .deleteMany({ workspaceId: new Types.ObjectId(workspaceId), sourceId: this.identifier(entry.recordId) }),
        this.connection
          .collection('knowledge_chunks')
          .deleteMany({ workspaceId: new Types.ObjectId(workspaceId), sourceId: this.identifier(entry.recordId) }),
      ]);
      return;
    }
    if (stage === 'cache') {
      if (this.redis.status === 'wait') await this.redis.connect();
      let cursor = '0';
      do {
        const [next, keys] = await this.redis.scan(
          cursor,
          'MATCH',
          `*${workspaceId}*`,
          'COUNT',
          250,
        );
        cursor = next;
        if (keys.length) await this.redis.del(...keys);
      } while (cursor !== '0');
      return;
    }
    const collection = this.connection.collection(entry.collection);
    const filter = {
      $and: [
        { _id: this.identifier(entry.recordId) },
        await this.scopeFilter(workspaceId, entry.dataClass),
      ],
    };
    if (entry.mode === 'hard_delete') await collection.deleteOne(filter);
    else
      await collection.updateOne(filter, {
        $set: {
          lifecycleState: 'anonymized',
          anonymizedAt: new Date(),
          email: `anonymized+${entry.recordId}@invalid.local`,
          displayName: 'Anonymized',
          name: 'Anonymized',
        },
        $unset: {
          passwordHash: '',
          phone: '',
          phoneNumbers: '',
          emailAddresses: '',
          address: '',
          content: '',
          payload: '',
        },
      });
    await this.records.updateOne(
      { workspaceId: new Types.ObjectId(workspaceId), dataClass: entry.dataClass, recordId: entry.recordId },
      {
        $set: {
          state: entry.mode === 'hard_delete' ? 'hard_deleted' : 'anonymized',
          deletedAt: new Date(),
        },
      },
      { upsert: true },
    );
  }

  private async isHeld(workspaceId: string, dataClass: DataClass, recordId: string) {
    return Boolean(
      await this.holds.exists({
        workspaceId: new Types.ObjectId(workspaceId),
        dataClass,
        releasedAt: null,
        $or: [{ recordId: null }, { recordId }],
      }),
    );
  }

  private async scopeFilter(workspaceId: string, dataClass: DataClass) {
    if (dataClass === 'workspaces') return { _id: new Types.ObjectId(workspaceId) };
    if (dataClass === 'users') {
      const memberships = await this.connection
        .collection('memberships')
        .find({ workspaceId: new Types.ObjectId(workspaceId) })
        .project({ userId: 1 })
        .toArray();
      return {
        _id: {
          $in: memberships
            .map((value) => value.userId as unknown)
            .filter((value): value is Types.ObjectId => value instanceof Types.ObjectId),
        },
      };
    }
    return { workspaceId: new Types.ObjectId(workspaceId) };
  }

  private expiredFilter(dataClass: DataClass, cutoff: Date): Record<string, unknown> {
    if (dataClass === 'users')
      return { status: 'disabled', updatedAt: { $lte: cutoff } };
    if (dataClass === 'workspaces')
      return { status: 'archived', updatedAt: { $lte: cutoff } };
    if (dataClass === 'contacts' || dataClass === 'files')
      return { deletedAt: { $ne: null, $lte: cutoff } };
    if (dataClass === 'knowledge_documents')
      return {
        $or: [
          { lifecycleState: { $in: ['archived', 'expired', 'scheduled_deletion'] }, updatedAt: { $lte: cutoff } },
          { deletedAt: { $ne: null, $lte: cutoff } },
        ],
      };
    if (dataClass === 'exports')
      return { expiresAt: { $ne: null, $lte: new Date() } };
    return { createdAt: { $lte: cutoff } };
  }

  private updateEntry(id: Types.ObjectId, index: number, fields: Record<string, unknown>) {
    return this.manifests.updateOne(
      { _id: id },
      { $set: Object.fromEntries(Object.entries(fields).map(([key, value]) => [`entries.${index}.${key}`, value])) },
    );
  }

  private finish(
    manifest: DataDeletionManifest,
    status: 'completed' | 'partial_failure' | 'failed',
    history: Record<string, unknown>,
  ) {
    return this.manifests
      .findByIdAndUpdate(
        manifest._id,
        {
          $set: {
            status,
            completedAt: status === 'completed' ? new Date() : null,
            lastError: status === 'completed' ? null : 'One or more deletion stages failed',
          },
          $push: { history: { at: new Date(), ...history } },
        },
        { new: true },
      )
      .lean()
      .exec();
  }

  private identifier(value: string) {
    if (!Types.ObjectId.isValid(value)) throw new BadRequestException('Invalid lifecycle record ID');
    return new Types.ObjectId(value);
  }
  private isDuplicate(error: unknown) {
    return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 11_000);
  }
}
