import { Readable } from 'node:stream';
import { Types } from 'mongoose';
import { describe, expect, it, vi } from 'vitest';
import { DataImportProcessor } from './data-transfer.processors.js';
import { StreamParserService } from '../services/stream-parser.service.js';
const oid = () => new Types.ObjectId();
const baseJob = {
  _id: oid(), workspaceId: oid(), actorId: oid(), entity: 'companies', format: 'csv',
  sourceStorageKey: 'source.csv', mapping: {}, duplicatePolicy: 'skip', dryRun: false,
};
function fixture(overrides: Record<string, unknown> = {}) {
  const job = { ...baseJob, ...overrides };
  const repository = {
    claim: vi.fn().mockResolvedValue(job),
    isCancelled: vi.fn().mockResolvedValue(false),
    progress: vi.fn(),
  };
  const collection = {
    findOne: vi.fn().mockResolvedValue({ _id: oid() }),
    updateOne: vi.fn(),
  };
  const storage = {
    get: () => ({
      readStream: () => Promise.resolve(Readable.from(['name,domain\nAcme,acme.test\n'])),
      writeStream: vi.fn(),
    }),
  };
  const receipts = {
    receiptExists: vi.fn().mockResolvedValue(false),
    createReceipt: vi.fn(),
    recordError: vi.fn(),
    errorCursor: () => (async function* () {})(),
  };
  const processor = new DataImportProcessor(
    repository as never, storage as never, new StreamParserService(),
    { validateValues: vi.fn() } as never, { record: vi.fn() } as never,
    { db: { collection: () => collection } } as never,
    receipts as never,
  );
  return { processor, repository, collection, receipts };
}
describe('DataImportProcessor reliability', () => {
  it('applies the skip duplicate policy and writes an idempotent row receipt', async () => {
    const { processor, collection, receipts } = fixture();
    const result = await processor.process({ data: { workspaceId: String(baseJob.workspaceId), jobId: String(baseJob._id) }, updateProgress: vi.fn() } as never);
    expect(collection.findOne).toHaveBeenCalled();
    expect(collection.updateOne).not.toHaveBeenCalled();
    expect(receipts.createReceipt).toHaveBeenCalled();
    expect(result).toEqual({ processed: 1, success: 0, skipped: 1, failed: 0 });
  });
  it('does not execute an already claimed retry', async () => {
    const { processor, repository, collection } = fixture();
    repository.claim.mockResolvedValue(null);
    await expect(processor.process({ data: { workspaceId: String(baseJob.workspaceId), jobId: String(baseJob._id) } } as never)).resolves.toEqual({ duplicate: true });
    expect(collection.findOne).not.toHaveBeenCalled();
  });
  it('stops between rows when cancellation is requested', async () => {
    const { processor, repository, collection } = fixture();
    repository.isCancelled.mockResolvedValue(true);
    await expect(processor.process({ data: { workspaceId: String(baseJob.workspaceId), jobId: String(baseJob._id) } } as never)).resolves.toEqual({ cancelled: true });
    expect(collection.updateOne).not.toHaveBeenCalled();
  });
});
