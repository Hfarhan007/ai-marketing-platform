import { Injectable } from '@nestjs/common';
import type { DataClass } from './data-lifecycle.types.js';
import { DataLifecycleRepository } from './repositories/data-lifecycle.service.js';

export { DATA_LIFECYCLE_QUEUE } from './repositories/data-lifecycle.service.js';

@Injectable()
export class DataLifecycleService {
  constructor(private readonly repository: DataLifecycleRepository) {}
  listPolicies(workspaceId: string) {
    return this.repository.listPolicies(workspaceId);
  }
  updatePolicy(
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
    return this.repository.updatePolicy(workspaceId, actorId, input);
  }
  createHold(
    workspaceId: string,
    actorId: string,
    input: { dataClass: DataClass; recordId?: string; reason: string },
  ) {
    return this.repository.createHold(workspaceId, actorId, input);
  }
  releaseHold(workspaceId: string, holdId: string) {
    return this.repository.releaseHold(workspaceId, holdId);
  }
  schedule(workspaceId: string, actorId: string, dryRun: boolean, idempotencyKey: string) {
    return this.repository.schedule(workspaceId, actorId, dryRun, idempotencyKey);
  }
  scheduleAll(dryRun = false) {
    return this.repository.scheduleAll(dryRun);
  }
  execute(manifestId: string, workspaceId: string) {
    return this.repository.execute(manifestId, workspaceId);
  }
  getManifest(workspaceId: string, manifestId: string) {
    return this.repository.getManifest(workspaceId, manifestId);
  }
  retry(workspaceId: string, manifestId: string, actorId: string) {
    return this.repository.retry(workspaceId, manifestId, actorId);
  }
  restore(workspaceId: string, dataClass: DataClass, recordId: string) {
    return this.repository.restore(workspaceId, dataClass, recordId);
  }
  scheduleDeletion(workspaceId: string, dataClass: DataClass, recordId: string) {
    return this.repository.scheduleDeletion(workspaceId, dataClass, recordId);
  }
}
