import { ConflictException, NotFoundException } from '@nestjs/common';
import type { ClientSession, Model, UpdateQuery, mongo } from 'mongoose';
import { Types } from 'mongoose';
import { TenantAwareRepository } from '../../common/repositories/tenant-aware.repository.js';
import type { CrmListQueryDto } from './crm.dto.js';
import type { CrmEntity, CrmPage } from './crm.types.js';

export abstract class CrmRepository<T extends CrmEntity> extends TenantAwareRepository<T> {
  protected constructor(
    model: Model<T>,
    private readonly sortable: ReadonlySet<string>,
  ) {
    super(model);
  }

  async page(
    workspaceId: string,
    query: CrmListQueryDto,
    filter: mongo.Filter<T> = {},
  ): Promise<CrmPage<T>> {
    const where = {
      ...filter,
      workspaceId: new Types.ObjectId(workspaceId),
      deletedAt: null,
    } as mongo.Filter<T>;
    const search = query.search?.trim();
    if (search) Object.assign(where, { $text: { $search: search } });
    if (query.status) Object.assign(where, { status: query.status });
    if (query.ownerId) Object.assign(where, { ownerId: new Types.ObjectId(query.ownerId) });
    if (query.tags?.length) Object.assign(where, { tags: { $all: query.tags } });
    const sortField = this.sortable.has(query.sort) ? query.sort : 'createdAt';
    const sort = { [sortField]: query.order === 'asc' ? 1 : -1 } as Record<string, 1 | -1>;
    const [items, total] = await Promise.all([
      this.model
        .find(where)
        .sort(sort)
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean<T[]>()
        .exec(),
      this.model.countDocuments(where).exec(),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }

  async getActive(workspaceId: string, id: string, session?: ClientSession): Promise<T> {
    const value = await this.model
      .findOne({
        _id: new Types.ObjectId(id),
        workspaceId: new Types.ObjectId(workspaceId),
        deletedAt: null,
      } as mongo.Filter<T>)
      .session(session ?? null)
      .lean<T>()
      .exec();
    if (!value) throw new NotFoundException('CRM resource not found');
    return value;
  }

  async createEntity(
    workspaceId: string,
    actorId: string,
    input: object,
    session?: ClientSession,
  ): Promise<T> {
    const value = new this.model({
      ...input,
      workspaceId: new Types.ObjectId(workspaceId),
      createdBy: new Types.ObjectId(actorId),
      updatedBy: new Types.ObjectId(actorId),
      deletedAt: null,
      version: 0,
    });
    await value.save(session ? { session } : {});
    return value.toObject();
  }

  async updateEntity(
    workspaceId: string,
    id: string,
    actorId: string,
    version: number,
    input: UpdateQuery<T>,
    session?: ClientSession,
  ): Promise<T> {
    const value = await this.model
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          workspaceId: new Types.ObjectId(workspaceId),
          deletedAt: null,
          version,
        } as mongo.Filter<T>,
        {
          $set: { ...input, updatedBy: new Types.ObjectId(actorId) },
          $inc: { version: 1 },
        },
        { new: true, runValidators: true, session: session ?? null },
      )
      .lean<T>()
      .exec();
    if (!value) throw new ConflictException('Resource changed or no longer exists');
    return value;
  }

  async softDelete(workspaceId: string, id: string, actorId: string, version: number): Promise<T> {
    return this.updateEntity(workspaceId, id, actorId, version, { deletedAt: new Date() });
  }

  async restore(workspaceId: string, id: string, actorId: string, version: number): Promise<T> {
    const value = await this.model
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          workspaceId: new Types.ObjectId(workspaceId),
          deletedAt: { $ne: null },
          version,
        } as mongo.Filter<T>,
        {
          $set: { deletedAt: null, updatedBy: new Types.ObjectId(actorId) },
          $inc: { version: 1 },
        },
        { new: true, runValidators: true },
      )
      .lean<T>()
      .exec();
    if (!value) throw new ConflictException('Resource changed or is not deleted');
    return value;
  }
}
