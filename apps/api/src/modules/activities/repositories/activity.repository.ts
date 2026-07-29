import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Activity, type ActivityDocument } from '../schemas/activity.schema.js';

@Injectable()
export class ActivityRepository {
  constructor(@InjectModel(Activity.name) private readonly model: Model<ActivityDocument>) {}
  async insert(input: Record<string, unknown>) {
    try {
      return (await this.model.create(input)).toObject();
    } catch (error) {
      if ((error as { code?: number }).code === 11000) return null;
      throw error;
    }
  }
  async page(
    workspaceId: string,
    query: {
      cursor?: string;
      limit: number;
      entityType?: string;
      entityId?: string;
      allowedVisibilities: string[];
      permissions: string[];
    },
  ) {
    const cursor = query.cursor ? this.decodeCursor(query.cursor) : undefined;
    const filter: Record<string, unknown> = {
      workspaceId: new Types.ObjectId(workspaceId),
      visibility: { $in: query.allowedVisibilities },
      $or: [
        { requiredPermissions: { $size: 0 } },
        { requiredPermissions: { $in: query.permissions } },
      ],
    };
    if (query.entityType && query.entityId) {
      filter.$and = [
        {
          $or: [
            { aggregateType: query.entityType, aggregateId: query.entityId },
            { relatedEntities: { $elemMatch: { type: query.entityType, id: query.entityId } } },
          ],
        },
      ];
    }
    if (cursor) {
      const condition = {
        $or: [
          { occurredAt: { $lt: cursor.occurredAt } },
          { occurredAt: cursor.occurredAt, _id: { $lt: cursor.id } },
        ],
      };
      if (Array.isArray(filter.$and))
        (filter.$and as Record<string, unknown>[]).push(condition);
      else filter.$and = [condition];
    }
    const values = await this.model
      .find(filter)
      .sort({ occurredAt: -1, _id: -1 })
      .limit(query.limit + 1)
      .lean()
      .exec();
    const hasMore = values.length > query.limit;
    if (hasMore) values.pop();
    const last = values.at(-1);
    return {
      items: values,
      nextCursor:
        hasMore && last
          ? Buffer.from(`${last.occurredAt.toISOString()}|${String(last._id)}`).toString(
              'base64url',
            )
          : null,
    };
  }
  private decodeCursor(value: string) {
    const [date, id] = Buffer.from(value, 'base64url').toString().split('|');
    if (!date || !id || Number.isNaN(Date.parse(date)) || !Types.ObjectId.isValid(id))
      throw new Error('ACTIVITY_CURSOR_INVALID');
    return { occurredAt: new Date(date), id: new Types.ObjectId(id) };
  }
}
