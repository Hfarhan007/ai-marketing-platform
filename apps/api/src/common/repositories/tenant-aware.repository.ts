import type { Model, PipelineStage, UpdateQuery, mongo } from 'mongoose';
import { tenantAggregate } from '../utils/tenant-aggregate.helper.js';
import { tenantFilter } from '../utils/tenant-query.helper.js';

export abstract class TenantAwareRepository<T extends { workspaceId: unknown }> {
  protected constructor(protected readonly model: Model<T>) {}

  findOne(workspaceId: string, filter: mongo.Filter<T>): Promise<T | null> {
    return this.model.findOne(tenantFilter(workspaceId, filter)).lean<T>().exec();
  }

  findMany(workspaceId: string, filter: mongo.Filter<T> = {}): Promise<T[]> {
    return this.model.find(tenantFilter(workspaceId, filter)).lean<T[]>().exec();
  }

  updateOne(
    workspaceId: string,
    filter: mongo.Filter<T>,
    update: UpdateQuery<T>,
  ): Promise<T | null> {
    this.assertWorkspaceIsNotMutated(update);
    return this.model
      .findOneAndUpdate(tenantFilter(workspaceId, filter), update, { new: true, runValidators: true })
      .lean<T>()
      .exec();
  }

  async deleteOne(workspaceId: string, filter: mongo.Filter<T>): Promise<boolean> {
    const result = await this.model.deleteOne(tenantFilter(workspaceId, filter)).exec();
    return result.deletedCount === 1;
  }

  aggregate<R>(workspaceId: string, pipeline: readonly PipelineStage[]): Promise<R[]> {
    return this.model.aggregate<R>(tenantAggregate(workspaceId, pipeline)).exec();
  }

  private assertWorkspaceIsNotMutated(update: UpdateQuery<T>): void {
    const candidate = update as Record<string, unknown>;
    if ('workspaceId' in candidate) throw new Error('workspaceId cannot be updated');
    for (const operator of ['$set', '$setOnInsert', '$unset', '$rename']) {
      const value = candidate[operator];
      if (typeof value === 'object' && value !== null && 'workspaceId' in value) {
        throw new Error('workspaceId cannot be updated');
      }
    }
  }
}
