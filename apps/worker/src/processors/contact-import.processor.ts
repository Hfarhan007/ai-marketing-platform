import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { ContactImportJob } from '@repo/job-contracts';
import ExcelJS from 'exceljs';
import mongoose, { Types } from 'mongoose';
import { createInterface } from 'node:readline';
import { Readable } from 'node:stream';
import type { WorkerConfig } from '../config.js';
import type { ProcessorContext } from './processors.js';

const csv = (line: string): string[] => {
  const result: string[] = []; let value = '', quoted = false;
  for (let index = 0; index < line.length; index += 1) { const char = line[index]; if (char === '"' && line[index + 1] === '"' && quoted) { value += '"'; index += 1; } else if (char === '"') quoted = !quoted; else if (char === ',' && !quoted) { result.push(value); value = ''; } else value += char; }
  result.push(value); return result;
};
const normalizeEmail = (value: string) => value.trim().toLowerCase();
const normalizePhone = (value: string) => { const digits = value.replace(/\D/gu, ''); return value.trim().startsWith('+') ? `+${digits}` : digits; };

export function createContactImportProcessor(config: WorkerConfig) {
  const s3 = new S3Client({ endpoint: config.S3_ENDPOINT, region: config.S3_REGION, forcePathStyle: true, credentials: { accessKeyId: config.S3_ACCESS_KEY, secretAccessKey: config.S3_SECRET_KEY } });
  return async (envelope: ContactImportJob, context: ProcessorContext): Promise<Record<string, unknown>> => {
    const database = mongoose.connection.db; if (!database) throw new Error('MONGODB_NOT_READY');
    const workspaceId = new Types.ObjectId(envelope.workspaceId), transferId = new Types.ObjectId(envelope.payload.transferJobId);
    const jobs = database.collection('data_transfer_jobs'), files = database.collection('files');
    const transfer = await jobs.findOneAndUpdate({ _id: transferId, workspaceId, status: 'queued', cancelRequested: false }, { $set: { status: 'running', lastError: null } }, { returnDocument: 'after' });
    if (!transfer) { const existing = await jobs.findOne({ _id: transferId, workspaceId }); return { duplicate: existing?.status === 'completed', cancelled: existing?.status === 'cancelled' }; }
    const file = await files.findOne({ _id: new Types.ObjectId(envelope.payload.fileId), workspaceId, status: 'active', scanStatus: 'clean' });
    if (!file || file.storageKey !== envelope.payload.storageKey) throw new Error('IMPORT_FILE_UNAVAILABLE');
    const response = await s3.send(new GetObjectCommand({ Bucket: config.S3_BUCKET, Key: envelope.payload.storageKey }));
    if (!response.Body) throw new Error('IMPORT_FILE_EMPTY');
    const contacts = database.collection('contacts'), receipts = database.collection('data_transfer_row_receipts'), progressEvents = database.collection('job_progress_events');
    let processed = 0, success = 0, skipped = 0, failed = 0;
    const processRow = async (raw: Record<string, unknown>, rowNumber: number) => {
      if (context.signal.aborted) throw new Error('JOB_CANCELLED');
      if (await jobs.findOne({ _id: transferId, workspaceId, cancelRequested: true }, { projection: { _id: 1 } })) throw new Error('JOB_CANCELLED');
      const row = Object.keys(envelope.payload.mapping).length ? Object.fromEntries(Object.entries(envelope.payload.mapping).filter(([source]) => source in raw).map(([source, target]) => [target, raw[source]])) : raw;
      const displayName = String(row.displayName ?? `${String(row.firstName ?? '')} ${String(row.lastName ?? '')}`).trim();
      if (!displayName) throw new Error('REQUIRED_FIELD:displayName');
      const email = typeof row.email === 'string' && row.email.trim() ? normalizeEmail(row.email) : null;
      const phone = typeof row.phone === 'string' && row.phone.trim() ? normalizePhone(row.phone) : null;
      const document = { ...row, displayName, emailAddresses: email ? [{ value: row.email, normalized: email, label: 'work', primary: true }] : [], phoneNumbers: phone ? [{ value: row.phone, normalized: phone, label: 'work', primary: true }] : [], updatedAt: new Date() };
      delete document.email; delete document.phone;
      const duplicate = email ? { workspaceId, deletedAt: null, 'emailAddresses.normalized': email } : phone ? { workspaceId, deletedAt: null, 'phoneNumbers.normalized': phone } : null;
      if (!envelope.payload.dryRun) {
        if (duplicate && envelope.payload.duplicatePolicy === 'skip' && await contacts.findOne(duplicate)) { skipped += 1; return; }
        if (duplicate && ['update', 'merge'].includes(envelope.payload.duplicatePolicy)) await contacts.updateOne(duplicate, { $set: document, $setOnInsert: { workspaceId, createdAt: new Date(), version: 0, deletedAt: null } }, { upsert: true });
        else await contacts.updateOne({ workspaceId, importRowKey: `${envelope.jobId}:${rowNumber}` }, { $setOnInsert: { ...document, workspaceId, importRowKey: `${envelope.jobId}:${rowNumber}`, createdAt: new Date(), version: 0, deletedAt: null } }, { upsert: true });
      }
      await receipts.updateOne({ workspaceId, jobId: transferId, rowNumber }, { $setOnInsert: { rowHash: envelope.idempotencyKey, status: envelope.payload.dryRun ? 'validated' : 'processed', createdAt: new Date(), updatedAt: new Date() } }, { upsert: true }); success += 1;
    };
    try {
      if (envelope.payload.format === 'xlsx') {
        const workbook = new ExcelJS.Workbook(); await workbook.xlsx.read(Readable.fromWeb(response.Body.transformToWebStream() as never));
        const sheet = workbook.worksheets[0]; if (!sheet) throw new Error('IMPORT_FILE_EMPTY');
        const headers = (sheet.getRow(1).values as unknown[]).slice(1).map(String);
        for (let number = 2; number <= sheet.rowCount; number += 1) { processed += 1; try { const values = (sheet.getRow(number).values as unknown[]).slice(1); await processRow(Object.fromEntries(headers.map((header, index) => [header, values[index]])), number); } catch (error) { if (error instanceof Error && error.message === 'JOB_CANCELLED') throw error; failed += 1; } }
      } else {
        const lines = createInterface({ input: Readable.fromWeb(response.Body.transformToWebStream() as never), crlfDelay: Infinity }); let headers: string[] = [];
        for await (const line of lines) { if (!line.trim()) continue; if (envelope.payload.format === 'csv' && !headers.length) { headers = csv(line); continue; } processed += 1; try { const raw = envelope.payload.format === 'json' ? JSON.parse(line) as Record<string, unknown> : Object.fromEntries(headers.map((header, index) => [header, csv(line)[index] ?? ''])); await processRow(raw, processed); } catch (error) { if (error instanceof Error && error.message === 'JOB_CANCELLED') throw error; failed += 1; }
          if (processed % 100 === 0) { const progress = Math.min(99, Math.floor(processed / (processed + 100) * 100)); await jobs.updateOne({ _id: transferId, workspaceId }, { $set: { processedRows: processed, successRows: success, skippedRows: skipped, errorRows: failed, progress } }); await progressEvents.insertOne({ workspaceId, jobId: envelope.jobId, correlationId: envelope.correlationId, progress, processedRows: processed, createdAt: new Date() }); await context.progress(progress); }
        }
      }
      await jobs.updateOne({ _id: transferId, workspaceId }, { $set: { status: 'completed', progress: 100, totalRows: processed, processedRows: processed, successRows: success, skippedRows: skipped, errorRows: failed, completedAt: new Date() } });
      await progressEvents.insertOne({ workspaceId, jobId: envelope.jobId, correlationId: envelope.correlationId, progress: 100, processedRows: processed, createdAt: new Date() }); await context.progress(100);
      await database.collection('notification_delivery_requests').updateOne({ workspaceId, deduplicationKey: `contact-import:${envelope.jobId}`, channel: 'in_app', destination: envelope.actorId }, { $setOnInsert: { definitionKey: 'contacts.import.completed', recipientUserId: envelope.actorId ? new Types.ObjectId(envelope.actorId) : null, destination: envelope.actorId ?? 'system', correlationId: envelope.correlationId, content: { body: `Contact import completed: ${success} imported, ${skipped} skipped, ${failed} failed.` }, status: 'queued', deliverAt: new Date(), attempts: 0, createdAt: new Date(), updatedAt: new Date() } }, { upsert: true });
      return { processed, success, skipped, failed };
    } catch (error) { const cancelled = error instanceof Error && error.message === 'JOB_CANCELLED'; await jobs.updateOne({ _id: transferId, workspaceId }, { $set: { status: cancelled ? 'cancelled' : 'failed', lastError: cancelled ? null : error instanceof Error ? error.message.slice(0, 500) : 'Import failed' } }); if (cancelled) return { cancelled: true }; throw error; }
  };
}
