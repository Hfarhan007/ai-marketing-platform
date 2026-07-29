import { Processor, WorkerHost } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import type { Job } from 'bullmq';
import ExcelJS from 'exceljs';
import { createCipheriv, createHash, randomBytes } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { appendFile, mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Connection, Types } from 'mongoose';
import { CrmEventService } from '../../crm/crm-event.service.js';
import { CustomFieldService } from '../../custom-fields/custom-field.service.js';
import { StorageProviderRegistry } from '../../files/storage/storage.providers.js';
import { ContactIdentityPolicy } from '../../crm/domain/contact-policy.js';
import { DATA_EXPORT_QUEUE, DATA_IMPORT_QUEUE } from '../services/data-transfer.service.js';
import { DataTransferRepository } from '../repositories/data-transfer.repository.js';
import { StreamParserService } from '../services/stream-parser.service.js';
import { DataTransferRowsRepository } from '../repositories/data-transfer-rows.repository.js';
import { FilterCompiler } from '../../search/filter-compiler.service.js';
import { ConsentEvaluationService } from '../../consent/consent-evaluation.service.js';
type Payload = { workspaceId: string; jobId: string };
const COLLECTIONS = {
  contacts: 'contacts',
  companies: 'companies',
  leads: 'leads',
  deals: 'deals',
  products: 'products',
  knowledge_faqs: 'knowledge_faqs',
} as const;
const REQUIRED: Record<keyof typeof COLLECTIONS, readonly string[]> = {
  contacts: ['displayName'],
  companies: ['name'],
  leads: ['name'],
  deals: ['title'],
  products: ['name'],
  knowledge_faqs: ['question', 'answer'],
};
@Processor(DATA_IMPORT_QUEUE, { concurrency: 2 })
export class DataImportProcessor extends WorkerHost {
  private readonly identities = new ContactIdentityPolicy();
  constructor(
    private readonly repository: DataTransferRepository,
    private readonly storage: StorageProviderRegistry,
    private readonly parser: StreamParserService,
    private readonly fields: CustomFieldService,
    private readonly events: CrmEventService,
    @InjectConnection() private readonly connection: Connection,
    private readonly rows: DataTransferRowsRepository,
  ) {
    super();
  }
  async process(queueJob: Job<Payload>) {
    const job = await this.repository.claim(queueJob.data.jobId);
    if (!job) return { duplicate: true };
    const entity = job.entity as keyof typeof COLLECTIONS,
      database = this.connection.db;
    if (!database || !COLLECTIONS[entity]) throw new Error('Import entity unavailable');
    const collection = database.collection(COLLECTIONS[entity]);
    const stream = await this.storage.get().readStream(job.sourceStorageKey!);
    let processed = 0,
      success = 0,
      skipped = 0,
      failed = 0;
    try {
      for await (const parsed of this.parser.parse(job.format as 'csv' | 'xlsx' | 'json', stream)) {
        if (await this.repository.isCancelled(String(job._id))) return { cancelled: true };
        processed += 1;
        try {
          const row = await this.prepare(
            entity,
            this.map(parsed.values, job.mapping),
            String(job.workspaceId),
          );
          for (const field of REQUIRED[entity])
            if (row[field] === undefined || row[field] === '')
              throw new Error(`REQUIRED_FIELD:${field}`);
          const rowHash = createHash('sha256').update(JSON.stringify(row)).digest('hex');
          if (
            await this.rows.receiptExists({
              workspaceId: job.workspaceId,
              jobId: job._id,
              rowNumber: parsed.rowNumber,
              rowHash,
            })
          ) {
            skipped += 1;
            continue;
          }
          const duplicate = this.duplicate(entity, row, job.workspaceId);
          let rowSkipped = false;
          if (!job.dryRun) {
            if (
              job.duplicatePolicy === 'skip' &&
              duplicate &&
              (await collection.findOne(duplicate))
            ) {
              skipped += 1;
              rowSkipped = true;
            } else if (duplicate && ['update', 'merge'].includes(job.duplicatePolicy))
              await collection.updateOne(
                duplicate,
                {
                  $set: row,
                  $setOnInsert: { workspaceId: job.workspaceId, createdAt: new Date() },
                  $currentDate: { updatedAt: true },
                },
                { upsert: true },
              );
            else
              await collection.updateOne(
                {
                  workspaceId: job.workspaceId,
                  importRowKey: `${String(job._id)}:${parsed.rowNumber}`,
                },
                {
                  $setOnInsert: {
                    ...row,
                    workspaceId: job.workspaceId,
                    importRowKey: `${String(job._id)}:${parsed.rowNumber}`,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  },
                },
                { upsert: true },
              );
          }
          await this.rows.createReceipt({
            workspaceId: job.workspaceId,
            jobId: job._id,
            rowNumber: parsed.rowNumber,
            rowHash,
            status: job.dryRun ? 'validated' : 'processed',
          });
          if (!rowSkipped) success += 1;
        } catch (error) {
          failed += 1;
          await this.rows.recordError(
            { workspaceId: job.workspaceId, jobId: job._id, rowNumber: parsed.rowNumber },
            {
              code: error instanceof Error ? error.message.split(':')[0] : 'ROW_INVALID',
              message: error instanceof Error ? error.message.slice(0, 500) : 'Invalid row',
              row: parsed.values,
            },
          );
        }
        if (processed % 100 === 0) {
          await this.repository.progress(String(job._id), {
            processedRows: processed,
            successRows: success,
            skippedRows: skipped,
            errorRows: failed,
            progress: Math.min(99, Math.floor((processed / Math.max(processed + 100, 1)) * 100)),
          });
          await queueJob.updateProgress(Math.min(99, processed));
        }
      }
      const reportKey = await this.writeErrorReport(job, String(job._id));
      await this.repository.progress(String(job._id), {
        status: 'completed',
        progress: 100,
        totalRows: processed,
        processedRows: processed,
        successRows: success,
        skippedRows: skipped,
        errorRows: failed,
        errorReportStorageKey: reportKey,
      });
      await this.events.record({
        workspaceId: String(job.workspaceId),
        actorId: String(job.actorId),
        entityType: 'data_import',
        entityId: String(job._id),
        action: job.dryRun ? 'dry_run_completed' : 'completed',
        metadata: { entity, processed, success, skipped, failed },
      });
      return { processed, success, skipped, failed };
    } catch (error) {
      await this.repository.progress(String(job._id), {
        status: 'failed',
        lastError: error instanceof Error ? error.message.slice(0, 500) : 'Import failed',
      });
      throw error;
    }
  }
  private map(row: Record<string, unknown>, mapping: Record<string, string>) {
    if (!Object.keys(mapping).length) return row;
    return Object.fromEntries(
      Object.entries(mapping)
        .filter(([source]) => source in row)
        .map(([source, target]) => [target, row[source]]),
    );
  }
  private async prepare(
    entity: keyof typeof COLLECTIONS,
    row: Record<string, unknown>,
    workspaceId: string,
  ) {
    const value = { ...row };
    if (entity === 'contacts') {
      if (typeof value.email === 'string')
        value.emailAddresses = this.identities.prepare(
          [{ value: value.email, primary: true }],
          'email',
        );
      if (typeof value.phone === 'string')
        value.phoneNumbers = this.identities.prepare(
          [{ value: value.phone, primary: true }],
          'phone',
        );
      delete value.email;
      delete value.phone;
    }
    if (entity === 'leads') {
      if (typeof value.email === 'string')
        value.normalizedEmail = this.identities.normalizeEmail(value.email);
      if (typeof value.phone === 'string')
        value.normalizedPhone = this.identities.normalizePhone(value.phone);
    }
    if (
      value.customFields &&
      typeof value.customFields === 'object' &&
      ['contacts', 'companies', 'leads', 'deals'].includes(entity)
    )
      value.customFields = await this.fields.validateValues(
        workspaceId,
        entity as 'contacts' | 'companies' | 'leads' | 'deals',
        value.customFields as Record<string, unknown>,
      );
    return value;
  }
  private duplicate(
    entity: keyof typeof COLLECTIONS,
    row: Record<string, unknown>,
    workspaceId: unknown,
  ) {
    const base = { workspaceId };
    if (entity === 'contacts' && Array.isArray(row.emailAddresses) && row.emailAddresses[0])
      return {
        ...base,
        'emailAddresses.normalized': (row.emailAddresses[0] as { normalized: string }).normalized,
      };
    if (entity === 'companies' && row.domain) return { ...base, domain: row.domain };
    if (entity === 'leads' && row.normalizedEmail)
      return { ...base, normalizedEmail: row.normalizedEmail };
    if (entity === 'products' && row.sku) return { ...base, sku: row.sku };
    if (entity === 'knowledge_faqs' && row.question) return { ...base, question: row.question };
    return null;
  }
  private async writeErrorReport(job: { workspaceId: unknown; _id: unknown }, jobId: string) {
    const directory = await mkdtemp(join(tmpdir(), 'data-import-')),
      path = join(directory, 'errors.ndjson'),
      key = `${String(job.workspaceId)}/data-transfers/${jobId}/errors.ndjson`;
    try {
      const output = createWriteStream(path);
      for await (const error of this.rows.errorCursor({
        workspaceId: new Types.ObjectId(String(job.workspaceId)),
        jobId: new Types.ObjectId(String(job._id)),
      }))
        if (
          !output.write(
            `${JSON.stringify({ rowNumber: error.rowNumber, code: error.code, message: error.message, row: error.row })}\n`,
          )
        )
          await new Promise<void>((resolve) => output.once('drain', resolve));
      await new Promise<void>((resolve, reject) => output.end(resolve).on('error', reject));
      const size = (await stat(path)).size;
      await this.storage
        .get()
        .writeStream(key, createReadStream(path), 'application/x-ndjson', size);
      return key;
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
}

@Processor(DATA_EXPORT_QUEUE, { concurrency: 2 })
export class DataExportProcessor extends WorkerHost {
  constructor(
    private readonly repository: DataTransferRepository,
    private readonly storage: StorageProviderRegistry,
    private readonly events: CrmEventService,
    private readonly config: ConfigService,
    private readonly filters: FilterCompiler,
    private readonly consent: ConsentEvaluationService,
    @InjectConnection() private readonly connection: Connection,
  ) {
    super();
  }
  async process(queueJob: Job<Payload>) {
    const job = await this.repository.claim(queueJob.data.jobId);
    if (!job) return { duplicate: true };
    const entity = job.entity as keyof typeof COLLECTIONS,
      database = this.connection.db;
    if (!database || !COLLECTIONS[entity]) throw new Error('Export entity unavailable');
    const directory = await mkdtemp(join(tmpdir(), 'data-export-')),
      plain = join(directory, `export.${job.format}`),
      encrypted = `${plain}.enc`;
    try {
      const safeFilter = ['contacts', 'companies', 'leads', 'deals'].includes(entity)
        ? this.filters.compile(
            entity as 'contacts' | 'companies' | 'leads' | 'deals',
            job.filter,
            String(job.workspaceId),
          )
        : { workspaceId: job.workspaceId };
      const cursor = database
        .collection(COLLECTIONS[entity])
        .find(safeFilter)
        .sort({ _id: 1 })
        .limit(1_000_000);
      let count = 0;
      if (job.format === 'xlsx') {
        const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ filename: plain }),
          sheet = workbook.addWorksheet('Export');
        for await (const document of cursor) {
          if (await this.repository.isCancelled(String(job._id))) return { cancelled: true };
          const row = await this.privacyRedact(job, entity, document, job.selectedFields);
          if (!count) {
            sheet.columns = Object.keys(row).map((key) => ({ header: key, key }));
          }
          sheet.addRow(row).commit();
          count += 1;
          if (count % 500 === 0) await queueJob.updateProgress(Math.min(99, count));
        }
        await workbook.commit();
      } else {
        const output = createWriteStream(plain);
        let headers: string[] = [];
        for await (const document of cursor) {
          if (await this.repository.isCancelled(String(job._id))) return { cancelled: true };
          const row = await this.privacyRedact(job, entity, document, job.selectedFields);
          if (!headers.length) {
            headers = Object.keys(row);
            if (job.format === 'csv')
              output.write(`${headers.map((header) => this.csv(header)).join(',')}\n`);
          }
          const line =
            job.format === 'json'
              ? `${JSON.stringify(row)}\n`
              : `${headers.map((key) => this.csv(row[key])).join(',')}\n`;
          if (!output.write(line))
            await new Promise<void>((resolve) => output.once('drain', resolve));
          count += 1;
          if (count % 500 === 0) await queueJob.updateProgress(Math.min(99, count));
        }
        await new Promise<void>((resolve, reject) => output.end(resolve).on('error', reject));
      }
      let source = plain,
        extension = job.format;
      if (job.encrypted) {
        const key = Buffer.from(this.config.getOrThrow<string>('auth.encryptionKey'), 'base64'),
          iv = randomBytes(12),
          cipher = createCipheriv('aes-256-gcm', key, iv);
        const output = createWriteStream(encrypted);
        output.write(iv);
        await pipeline(createReadStream(plain), cipher, output);
        await appendFile(encrypted, cipher.getAuthTag());
        source = encrypted;
        extension = `${extension}.enc`;
      }
      const storageKey = `${String(job.workspaceId)}/data-transfers/${String(job._id)}/export.${extension}`,
        size = (await stat(source)).size;
      await this.storage
        .get()
        .writeStream(
          storageKey,
          createReadStream(source),
          job.encrypted ? 'application/octet-stream' : this.mime(job.format),
          size,
        );
      await this.repository.progress(String(job._id), {
        status: 'completed',
        progress: 100,
        processedRows: count,
        successRows: count,
        totalRows: count,
        resultStorageKey: storageKey,
      });
      await this.events.record({
        workspaceId: String(job.workspaceId),
        actorId: String(job.actorId),
        entityType: 'data_export',
        entityId: String(job._id),
        action: 'completed',
        metadata: { entity, count, encrypted: job.encrypted },
      });
      return { count };
    } catch (error) {
      await this.repository.progress(String(job._id), {
        status: 'failed',
        lastError: error instanceof Error ? error.message.slice(0, 500) : 'Export failed',
      });
      throw error;
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
  private redact(document: Record<string, unknown>, selected: string[]) {
    const forbidden = new Set([
      'workspaceId',
      'passwordHash',
      'tokens',
      'credentials',
      'twoFactorSecret',
      'storageKey',
    ]);
    const fields = selected.length ? selected : Object.keys(document);
    return Object.fromEntries(
      fields
        .filter((field) => !forbidden.has(field) && !field.startsWith('$') && !field.includes('.'))
        .map((field) => [field, document[field]]),
    );
  }
  private async privacyRedact(
    job: { workspaceId: unknown },
    entity: string,
    document: Record<string, unknown>,
    selected: string[],
  ) {
    const row = this.redact(document, selected);
    if (entity !== 'contacts' || !(document._id instanceof Types.ObjectId)) return row;
    const customFields =
      document.customFields && typeof document.customFields === 'object'
        ? (document.customFields as Record<string, unknown>)
        : {};
    const region = typeof customFields.region === 'string' ? customFields.region : 'GLOBAL';
    const restricted = await this.consent.restrictedExportFields(
      String(job.workspaceId),
      document._id.toHexString(),
      region,
    );
    return Object.fromEntries(Object.entries(row).filter(([field]) => !restricted.has(field)));
  }
  private csv(value: unknown) {
    let text = '';
    if (value && typeof value === 'object') text = JSON.stringify(value);
    else if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      typeof value === 'bigint'
    )
      text = String(value);
    return `"${text.replaceAll('"', '""')}"`;
  }
  private mime(format: string) {
    return format === 'csv'
      ? 'text/csv'
      : format === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/x-ndjson';
  }
}
