import { Injectable } from '@nestjs/common';
import type { ClientSession, mongo } from 'mongoose';
import { MongoConnection } from '../mongo/mongo.connection.js';
import { TRANSACTION_RETRY_LIMIT } from '../mongo/mongo.constants.js';

const DEFAULT_TRANSACTION_OPTIONS: mongo.TransactionOptions = {
  readConcern: { level: 'snapshot' },
  writeConcern: { w: 'majority' },
  readPreference: 'primary',
};

interface MongoRetryableError {
  hasErrorLabel(label: string): boolean;
}

@Injectable()
export class TransactionManagerService {
  constructor(private readonly mongo: MongoConnection) {}

  async run<T>(
    operation: (session: ClientSession) => Promise<T>,
    options: mongo.TransactionOptions = DEFAULT_TRANSACTION_OPTIONS,
  ): Promise<T> {
    let attempt = 0;
    while (attempt < TRANSACTION_RETRY_LIMIT) {
      const session = await this.mongo.native.startSession();
      try {
        let result!: T;
        let completed = false;
        await session.withTransaction(async () => {
          result = await operation(session);
          completed = true;
        }, options);
        if (!completed) throw new Error('Transaction callback did not complete');
        return result;
      } catch (error: unknown) {
        attempt += 1;
        if (attempt >= TRANSACTION_RETRY_LIMIT || !this.isTransient(error)) throw error;
      } finally {
        await session.endSession();
      }
    }
    throw new Error('Transaction retry limit exhausted');
  }

  private isTransient(error: unknown): error is MongoRetryableError {
    if (typeof error !== 'object' || error === null) return false;
    const candidate = error as Partial<MongoRetryableError>;
    if (typeof candidate.hasErrorLabel !== 'function') return false;
    return (
      candidate.hasErrorLabel('TransientTransactionError') ||
      candidate.hasErrorLabel('UnknownTransactionCommitResult')
    );
  }
}
