import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, type mongo } from 'mongoose';
import { DataTransferRowError, DataTransferRowReceipt } from '../schemas/data-transfer.schemas.js';
@Injectable()
export class DataTransferRowsRepository {
  constructor(
    @InjectModel(DataTransferRowReceipt.name) private readonly receipts: Model<DataTransferRowReceipt>,
    @InjectModel(DataTransferRowError.name) private readonly errors: Model<DataTransferRowError>,
  ) {}
  receiptExists(filter: mongo.Filter<DataTransferRowReceipt>) { return this.receipts.exists(filter); }
  createReceipt(input: Record<string, unknown>) { return this.receipts.create(input); }
  recordError(filter: mongo.Filter<DataTransferRowError>, error: Record<string, unknown>) {
    return this.errors.updateOne(filter, { $set: error }, { upsert: true });
  }
  errorCursor(filter: mongo.Filter<DataTransferRowError>) {
    return this.errors.find(filter).sort({ rowNumber: 1 }).lean().cursor();
  }
}
