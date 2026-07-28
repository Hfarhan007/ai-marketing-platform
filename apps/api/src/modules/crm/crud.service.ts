import type { WorkspaceRequestContext } from '../../common/types/workspace-context.js';
import type { CrmListQueryDto } from './crm.dto.js';
import { CrmEventService } from './crm-event.service.js';
import { CrmJobsService } from './crm-jobs.service.js';
import { CrmRepository } from './crm.repository.js';
import type { CrmEntity } from './crm.types.js';

export abstract class CrmCrudService<
  T extends CrmEntity,
  C extends object,
  U extends C & { version: number },
> {
  protected constructor(
    protected readonly repository: CrmRepository<T>,
    protected readonly events: CrmEventService,
    protected readonly jobs: CrmJobsService,
    protected readonly entityType:
      | 'companies'
      | 'leads'
      | 'deals'
      | 'pipelines'
      | 'tasks'
      | 'services'
      | 'availability'
      | 'booking-links',
    protected readonly map: (value: T) => object,
  ) {}
  async list(context: WorkspaceRequestContext, query: CrmListQueryDto) {
    const page = await this.repository.page(context.workspaceId, query);
    return { ...page, items: page.items.map(this.map) };
  }
  async get(context: WorkspaceRequestContext, id: string) {
    return this.map(await this.repository.getActive(context.workspaceId, id));
  }
  async create(context: WorkspaceRequestContext, dto: C) {
    const value = await this.repository.createEntity(
      context.workspaceId,
      context.userId,
      this.prepare(dto),
    );
    await this.record(context, value, 'created');
    return this.map(value);
  }
  async update(context: WorkspaceRequestContext, id: string, dto: U) {
    const { version, ...input } = dto;
    const value = await this.repository.updateEntity(
      context.workspaceId,
      id,
      context.userId,
      version,
      this.prepare(input as C),
    );
    await this.record(context, value, 'updated');
    return this.map(value);
  }
  async remove(context: WorkspaceRequestContext, id: string, version: number) {
    const value = await this.repository.softDelete(
      context.workspaceId,
      id,
      context.userId,
      version,
    );
    await this.record(context, value, 'deleted');
    return this.map(value);
  }
  async restore(context: WorkspaceRequestContext, id: string, version: number) {
    const value = await this.repository.restore(context.workspaceId, id, context.userId, version);
    await this.record(context, value, 'restored');
    return this.map(value);
  }
  createJob(
    kind: 'import' | 'export',
    context: WorkspaceRequestContext,
    options: Record<string, string | number | boolean>,
  ) {
    return this.jobs.create(kind, this.entityType, context.workspaceId, context.userId, options);
  }
  async bulk(
    context: WorkspaceRequestContext,
    items: readonly { id: string; version: number }[],
    action: 'delete' | 'restore',
  ) {
    const results = await Promise.allSettled(
      items.map((item) =>
        action === 'delete'
          ? this.remove(context, item.id, item.version)
          : this.restore(context, item.id, item.version),
      ),
    );
    return results.map((result, index) =>
      result.status === 'fulfilled'
        ? { id: items[index]?.id, success: true }
        : { id: items[index]?.id, success: false, error: 'Resource changed or unavailable' },
    );
  }
  protected prepare(dto: C): object {
    return dto;
  }
  protected record(context: WorkspaceRequestContext, value: T, action: string) {
    return this.events.record({
      workspaceId: context.workspaceId,
      actorId: context.userId,
      entityType: this.entityType.slice(0, -1),
      entityId: String(value._id),
      action,
    });
  }
}
