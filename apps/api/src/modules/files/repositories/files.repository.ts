import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import { StoredFile, type StoredFileDocument } from '../schemas/file.schema.js';
@Injectable()
export class FilesRepository {
  constructor(@InjectModel(StoredFile.name) private readonly files: Model<StoredFileDocument>) {}
  async create(input: object) {
    const value = new this.files(input);
    await value.save();
    return value.toObject();
  }
  async get(workspaceId: string, id: string) {
    const value = await this.files
      .findOne({ _id: new Types.ObjectId(id), workspaceId: new Types.ObjectId(workspaceId) })
      .lean<StoredFile>()
      .exec();
    if (!value) throw new NotFoundException('File not found');
    return value;
  }
  duplicate(workspaceId: string, checksum: string, size: number) {
    return this.files
      .findOne({
        workspaceId: new Types.ObjectId(workspaceId),
        checksum,
        size,
        status: 'active',
        deletedAt: null,
      })
      .lean<StoredFile>()
      .exec();
  }
  complete(workspaceId: string, id: string, update: object) {
    return this.files
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          workspaceId: new Types.ObjectId(workspaceId),
          status: 'pending',
        },
        { $set: update },
        { new: true },
      )
      .lean<StoredFile>()
      .exec();
  }
  update(workspaceId: string, id: string, filter: object, update: object) {
    return this.files
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), workspaceId: new Types.ObjectId(workspaceId), ...filter },
        update,
        { new: true },
      )
      .lean<StoredFile>()
      .exec();
  }
  async usage(workspaceId: string) {
    const result = await this.files.aggregate<{ _id: null; bytes: number; count: number }>([
      {
        $match: { workspaceId: new Types.ObjectId(workspaceId), status: 'active', deletedAt: null },
      },
      { $group: { _id: null, bytes: { $sum: '$size' }, count: { $sum: 1 } } },
    ]);
    return result[0] ?? { _id: null, bytes: 0, count: 0 };
  }
  orphans(now: Date, limit = 100) {
    return this.files
      .find({
        $or: [
          { status: 'pending', uploadExpiresAt: { $lt: now } },
          { status: 'deleted', deletedAt: { $lt: new Date(now.valueOf() - 30 * 86_400_000) } },
        ],
      })
      .limit(limit)
      .lean<StoredFile[]>()
      .exec();
  }
  markPurged(id: string) {
    return this.files.updateOne(
      { _id: new Types.ObjectId(id) },
      { $set: { status: 'failed', processingStatus: 'completed' } },
    );
  }
}
