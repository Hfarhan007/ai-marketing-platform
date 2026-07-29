import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { Types } from 'mongoose';
import type { WorkspaceRequestContext } from '../../../common/types/workspace-context.js';
import { FilesRepository } from '../../files/repositories/files.repository.js';
import { StorageProviderRegistry } from '../../files/storage/storage.providers.js';
import {
  CreateExportDto,
  CreateImportDto,
  UpdateImportMappingDto,
} from '../dto/data-transfer.dto.js';
import { DataTransferRepository } from '../repositories/data-transfer.repository.js';
import { StreamParserService } from './stream-parser.service.js';
import { PolicyService } from '../../permissions/services/policy.service.js';
import type { Permission } from '../../permissions/constants/permission.catalog.js';
export const DATA_IMPORT_QUEUE = 'data-imports',
  DATA_EXPORT_QUEUE = 'data-exports';
@Injectable()
export class DataTransferService {
  constructor(
    private readonly repository: DataTransferRepository,
    private readonly files: FilesRepository,
    private readonly storage: StorageProviderRegistry,
    private readonly parser: StreamParserService,
    private readonly policy: PolicyService,
    @InjectQueue(DATA_IMPORT_QUEUE) private readonly imports: Queue,
    @InjectQueue(DATA_EXPORT_QUEUE) private readonly exports: Queue,
  ) {}
  async createImport(c: WorkspaceRequestContext, dto: CreateImportDto) {
    await this.assertPermission(c, dto.entity, true);
    await this.assertCapacity(c.workspaceId);
    const file = await this.files.get(c.workspaceId, dto.fileId);
    if (file.status !== 'active' || file.scanStatus !== 'clean')
      throw new BadRequestException('IMPORT_FILE_UNAVAILABLE');
    if (file.size > 250 * 1024 * 1024) throw new BadRequestException('IMPORT_FILE_LIMIT_EXCEEDED');
    const format = dto.format ?? this.detect(file.extension);
    const stream = await this.storage.get().readStream(file.storageKey);
    const preview: Record<string, unknown>[] = [];
    let headers: string[] = [];
    for await (const row of this.parser.parse(format, stream)) {
      if (!headers.length) headers = Object.keys(row.values);
      preview.push(row.values);
      if (preview.length === 20) {
        stream.destroy();
        break;
      }
    }
    const job = await this.repository.create({
      workspaceId: new Types.ObjectId(c.workspaceId),
      actorId: new Types.ObjectId(c.userId),
      kind: 'import',
      entity: dto.entity,
      sourceFileId: file._id,
      sourceStorageKey: file.storageKey,
      format,
      mapping: dto.mapping,
      duplicatePolicy: dto.duplicatePolicy,
      dryRun: dto.dryRun,
      idempotencyKey: dto.idempotencyKey,
      status: 'draft',
      headers,
      preview,
      expiresAt: new Date(Date.now() + 30 * 86_400_000),
    });
    return this.map(job);
  }
  async configure(c: WorkspaceRequestContext, id: string, dto: UpdateImportMappingDto) {
    this.validateMapping(dto.mapping);
    const value = await this.repository.update(
      c.workspaceId,
      id,
      { status: 'draft', kind: 'import' },
      { $set: dto },
    );
    if (!value) throw new ConflictException('Import can no longer be configured');
    return this.map(value);
  }
  async start(c: WorkspaceRequestContext, id: string) {
    const job = await this.repository.update(
      c.workspaceId,
      id,
      { status: 'draft' },
      { $set: { status: 'queued' } },
    );
    if (!job) throw new ConflictException('Data transfer job is not startable');
    const queue = job.kind === 'import' ? this.imports : this.exports;
    await queue.add(
      job.kind,
      { workspaceId: c.workspaceId, jobId: id },
      {
        jobId: `data-${job.kind}-${id}`,
        attempts: 5,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 1000,
      },
    );
    return { accepted: true, jobId: id };
  }
  async createExport(c: WorkspaceRequestContext, dto: CreateExportDto) {
    await this.assertPermission(c, dto.entity, false);
    await this.assertCapacity(c.workspaceId);
    const job = await this.repository.create({
      workspaceId: new Types.ObjectId(c.workspaceId),
      actorId: new Types.ObjectId(c.userId),
      kind: 'export',
      entity: dto.entity,
      format: dto.format,
      selectedFields: dto.fields,
      filter: dto.filter,
      encrypted: dto.encrypted,
      idempotencyKey: dto.idempotencyKey,
      status: 'draft',
      expiresAt: new Date(Date.now() + 7 * 86_400_000),
    });
    return this.start(c, String(job._id));
  }
  async correctedReimport(
    c: WorkspaceRequestContext,
    id: string,
    fileId: string,
    idempotencyKey: string,
  ) {
    const prior = await this.repository.get(c.workspaceId, id);
    if (prior.kind !== 'import') throw new BadRequestException('IMPORT_JOB_REQUIRED');
    return this.createImport(c, {
      fileId,
      entity: prior.entity as CreateImportDto['entity'],
      format: prior.format as 'csv' | 'xlsx' | 'json',
      mapping: prior.mapping,
      duplicatePolicy: prior.duplicatePolicy as CreateImportDto['duplicatePolicy'],
      dryRun: prior.dryRun,
      idempotencyKey,
    });
  }
  async cancel(c: WorkspaceRequestContext, id: string) {
    const value = await this.repository.update(
      c.workspaceId,
      id,
      { status: { $in: ['draft', 'queued', 'running'] } },
      { $set: { cancelRequested: true, status: 'cancelled' } },
    );
    if (!value) throw new ConflictException('Job cannot be cancelled');
    return this.map(value);
  }
  async status(c: WorkspaceRequestContext, id: string) {
    return this.map(await this.repository.get(c.workspaceId, id));
  }
  async download(c: WorkspaceRequestContext, id: string, errors = false) {
    const job = await this.repository.get(c.workspaceId, id),
      key = errors ? job.errorReportStorageKey : job.resultStorageKey;
    if (!key || !job.expiresAt || job.expiresAt < new Date())
      throw new NotFoundException('Report is unavailable');
    return {
      url: await this.storage.get().presignDownload(key, 300),
      expiresIn: 300,
      encrypted: job.encrypted,
    };
  }
  private detect(extension: string): 'csv' | 'xlsx' | 'json' {
    const value = extension.replace('.', '').toLowerCase();
    if (value === 'csv' || value === 'xlsx' || value === 'json') return value;
    throw new BadRequestException('IMPORT_FORMAT_UNSUPPORTED');
  }
  private validateMapping(mapping: Record<string, string>) {
    if (
      Object.keys(mapping).length > 250 ||
      Object.entries(mapping).some(
        ([source, target]) =>
          !source ||
          !/^[a-zA-Z][a-zA-Z0-9_.]*$/u.test(target) ||
          source.startsWith('$') ||
          target.startsWith('$'),
      )
    )
      throw new BadRequestException('IMPORT_MAPPING_INVALID');
  }
  private async assertCapacity(workspaceId: string) {
    if ((await this.repository.activeCount(workspaceId)) >= 5)
      throw new ConflictException('WORKSPACE_TRANSFER_LIMIT_REACHED');
  }
  private async assertPermission(
    context: WorkspaceRequestContext,
    entity: CreateImportDto['entity'],
    write: boolean,
  ) {
    const permissions: Record<CreateImportDto['entity'], [Permission, Permission]> = {
      contacts: ['contacts.create', 'contacts.read'],
      companies: ['companies.create', 'companies.read'],
      leads: ['leads.create', 'leads.read'],
      deals: ['deals.manage', 'deals.read'],
      products: ['deals.manage', 'deals.read'],
      knowledge_faqs: ['agents.manage', 'agents.manage'],
    };
    const ability = await this.policy.ability(context);
    if (!this.policy.has(ability, permissions[entity][write ? 0 : 1]))
      throw new ConflictException('DATA_TRANSFER_PERMISSION_DENIED');
  }
  private map(job: {
    _id: unknown;
    kind: string;
    entity: string;
    format: string;
    status: string;
    progress: number;
    headers: string[];
    preview: Record<string, unknown>[];
    totalRows: number;
    processedRows: number;
    successRows: number;
    skippedRows: number;
    errorRows: number;
    expiresAt: Date | null;
  }) {
    return {
      id: String(job._id),
      kind: job.kind,
      entity: job.entity,
      format: job.format,
      status: job.status,
      progress: job.progress,
      headers: job.headers,
      preview: job.preview,
      totals: {
        total: job.totalRows,
        processed: job.processedRows,
        success: job.successRows,
        skipped: job.skippedRows,
        errors: job.errorRows,
      },
      expiresAt: job.expiresAt,
    };
  }
}
