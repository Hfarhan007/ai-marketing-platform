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
    const direction = query.order === 'asc' ? 1 : -1;
    const countWhere: mongo.Filter<T> = { ...where };
    const cursor = query.cursor ? this.decodeCursor(query.cursor, sortField) : null;
    if (cursor) {
      Object.assign(where, {
        $and: [
          {
            $or: [
              { [sortField]: { [direction === 1 ? '$gt' : '$lt']: cursor.value } },
              { [sortField]: cursor.value, _id: { [direction === 1 ? '$gt' : '$lt']: cursor.id } },
            ],
          },
        ],
      });
    }
    const sort = { [sortField]: direction, _id: direction } as Record<string, 1 | -1>;
    const [values, total] = await Promise.all([
      this.model
        .find(where)
        .sort(sort)
        .skip(cursor ? 0 : (query.page - 1) * query.limit)
        .limit(query.limit + 1)
        .lean<T[]>()
        .exec(),
      this.model.countDocuments(countWhere).exec(),
    ]);
    const hasMore = values.length > query.limit;
    const items = hasMore ? values.slice(0, query.limit) : values;
    const last = items.at(-1) as (T & Record<string, unknown>) | undefined;
    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
      nextCursor:
        hasMore && last
          ? Buffer.from(JSON.stringify({ value: last[sortField], id: String(last._id) })).toString(
              'base64url',
            )
          : null,
    };
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

  async softDelete(
    workspaceId: string,
    id: string,
    actorId: string,
    version: number,
    session?: ClientSession,
  ): Promise<T> {
    return this.updateEntity(workspaceId, id, actorId, version, { deletedAt: new Date() }, session);
  }

  async restore(
    workspaceId: string,
    id: string,
    actorId: string,
    version: number,
    session?: ClientSession,
  ): Promise<T> {
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
        { new: true, runValidators: true, session: session ?? null },
      )
      .lean<T>()
      .exec();
    if (!value) throw new ConflictException('Resource changed or is not deleted');
    return value;
  }

  private decodeCursor(value: string, sortField: string): { value: unknown; id: Types.ObjectId } {
    try {
      const decoded = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as {
        value?: unknown;
        id?: unknown;
      };
      if (typeof decoded.id !== 'string' || !Types.ObjectId.isValid(decoded.id)) throw new Error();
      const cursorValue =
        sortField.endsWith('At') && typeof decoded.value === 'string'
          ? new Date(decoded.value)
          : decoded.value;
      if (cursorValue === undefined) throw new Error();
      return { value: cursorValue, id: new Types.ObjectId(decoded.id) };
    } catch {
      throw new ConflictException('Invalid pagination cursor');
    }
  }
}
