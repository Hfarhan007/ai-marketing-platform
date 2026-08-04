import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import { FileTextExtraction } from '../schemas/text-extraction.schema.js';
import type { TextExtractionResult } from '../extraction/text-extraction.types.js';
@Injectable()
export class TextExtractionRepository {
  constructor(@InjectModel(FileTextExtraction.name) private readonly extractions: Model<FileTextExtraction>) {}
  completed(workspaceId: string, fileId: string, checksum: string, toolVersion: string) { return this.extractions.findOne({ workspaceId: new Types.ObjectId(workspaceId), fileId: new Types.ObjectId(fileId), sourceChecksum: checksum, toolVersion, status: 'completed' }).lean().exec(); }
  save(workspaceId: string, fileId: string, checksum: string, result: TextExtractionResult) { return this.extractions.findOneAndUpdate({ workspaceId: new Types.ObjectId(workspaceId), fileId: new Types.ObjectId(fileId), sourceChecksum: checksum, toolVersion: result.toolVersion }, { $set: { ...result, workspaceId: new Types.ObjectId(workspaceId), fileId: new Types.ObjectId(fileId), sourceChecksum: checksum, status: 'completed' } }, { upsert: true, new: true }).lean().exec(); }
}
