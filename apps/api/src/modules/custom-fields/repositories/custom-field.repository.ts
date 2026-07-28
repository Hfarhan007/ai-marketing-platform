import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { CustomFieldEntity } from '../custom-field.types.js';
import {
  CustomFieldDefinition,
  type CustomFieldDefinitionDocument,
} from '../schemas/custom-field.schema.js';

@Injectable()
export class CustomFieldRepository {
  constructor(
    @InjectModel(CustomFieldDefinition.name)
    private readonly model: Model<CustomFieldDefinitionDocument>,
  ) {}
  list(workspaceId: string, entityType: CustomFieldEntity, includeArchived = false) {
    return this.model
      .find({
        workspaceId: new Types.ObjectId(workspaceId),
        entityType,
        ...(includeArchived ? {} : { archived: false }),
      })
      .sort({ group: 1, label: 1 })
      .lean()
      .exec();
  }
  async create(workspaceId: string, actorId: string, input: Record<string, unknown>) {
    try {
      return (
        await this.model.create({
          ...input,
          workspaceId: new Types.ObjectId(workspaceId),
          createdBy: new Types.ObjectId(actorId),
          updatedBy: new Types.ObjectId(actorId),
        })
      ).toObject();
    } catch (error) {
      if ((error as { code?: number }).code === 11000)
        throw new ConflictException('Custom field key already exists');
      throw error;
    }
  }
  async get(workspaceId: string, id: string) {
    const value = await this.model
      .findOne({ _id: new Types.ObjectId(id), workspaceId: new Types.ObjectId(workspaceId) })
      .lean()
      .exec();
    if (!value) throw new NotFoundException('Custom field definition not found');
    return value;
  }
  async update(
    workspaceId: string,
    id: string,
    actorId: string,
    version: number,
    update: Record<string, unknown>,
  ) {
    const value = await this.model
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          workspaceId: new Types.ObjectId(workspaceId),
          version,
        },
        {
          $set: { ...update, updatedBy: new Types.ObjectId(actorId) },
          $inc: { version: 1 },
        },
        { new: true },
      )
      .lean()
      .exec();
    if (!value) throw new ConflictException('Custom field definition changed');
    return value;
  }
  countIndexed(workspaceId: string) {
    return this.model.countDocuments({
      workspaceId: new Types.ObjectId(workspaceId),
      indexed: true,
      archived: false,
    });
  }
}
