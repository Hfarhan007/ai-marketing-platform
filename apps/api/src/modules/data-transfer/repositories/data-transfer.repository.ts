import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, type mongo } from 'mongoose';
import { DataTransferJob } from '../schemas/data-transfer.schemas.js';
@Injectable()
export class DataTransferRepository {
  constructor(@InjectModel(DataTransferJob.name) private readonly jobs: Model<DataTransferJob>) {}
  async create(input: Record<string, unknown>) {
    try {
      return (await this.jobs.create(input)).toObject();
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        const existing = await this.jobs
          .findOne({ workspaceId: input.workspaceId, idempotencyKey: input.idempotencyKey } as mongo.Filter<DataTransferJob>)
          .lean<DataTransferJob>()
          .exec();
        if (existing) return existing;
      }
      throw error;
    }
  }
  async get(workspaceId: string, id: string) {
    const value = await this.jobs
      .findOne({ _id: new Types.ObjectId(id), workspaceId: new Types.ObjectId(workspaceId) })
      .lean<DataTransferJob>()
      .exec();
    if (!value) throw new NotFoundException('Data transfer job not found');
    return value;
  }
  update(
    workspaceId: string,
    id: string,
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
  ) {
    return this.jobs
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), workspaceId: new Types.ObjectId(workspaceId), ...filter },
        update,
        { new: true },
      )
      .lean<DataTransferJob>()
      .exec();
  }
  async activeCount(workspaceId: string) {
    return this.jobs.countDocuments({
      workspaceId: new Types.ObjectId(workspaceId),
      status: { $in: ['draft', 'queued', 'running'] },
    });
  }
  claim(id: string) {
    return this.jobs
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), status: 'queued', cancelRequested: false },
        { $set: { status: 'running', lastError: null } },
        { new: true },
      )
      .lean<DataTransferJob>()
      .exec();
  }
  isCancelled(id: string) {
    return this.jobs.exists({ _id: new Types.ObjectId(id), cancelRequested: true });
  }
  progress(id: string, update: Record<string, unknown>) {
    return this.jobs.updateOne(
      { _id: new Types.ObjectId(id), status: 'running' },
      { $set: update },
    );
  }
}
