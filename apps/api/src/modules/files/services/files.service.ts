import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Queue } from 'bullmq';
import { createHash, randomUUID } from 'node:crypto';
import { Types } from 'mongoose';
import type { WorkspaceRequestContext } from '../../../common/types/workspace-context.js';
import { CompleteUploadDto, InitiateUploadDto, UsageReferenceDto } from '../dto/file.dto.js';
import { FilesRepository } from '../repositories/files.repository.js';
import type { StoredFile } from '../schemas/file.schema.js';
import { StorageProviderRegistry } from '../storage/storage.providers.js';
import { FilePolicyService } from './file-policy.service.js';
export const FILE_PROCESSING_QUEUE = 'file-processing';
export const FILE_CLEANUP_QUEUE = 'file-cleanup';
const map = (v: StoredFile) => ({
  id: String(v._id),
  originalName: v.originalName,
  mimeType: v.mimeType,
  extension: v.extension,
  size: v.size,
  checksum: v.checksum,
  dimensions: v.dimensions,
  duration: v.duration,
  folder: v.folder,
  tags: v.tags,
  status: v.status,
  scanStatus: v.scanStatus,
  processingStatus: v.processingStatus,
  usageReferences: v.usageReferences,
  createdAt: v.createdAt,
  updatedAt: v.updatedAt,
});
@Injectable()
export class FilesService {
  private readonly maxSize: number;
  constructor(
    private readonly repository: FilesRepository,
    private readonly policy: FilePolicyService,
    private readonly storage: StorageProviderRegistry,
    config: ConfigService,
    @InjectQueue(FILE_PROCESSING_QUEUE) private readonly queue: Queue,
  ) {
    this.maxSize = config.getOrThrow<number>('storage.maxFileSizeBytes');
  }
  async initiate(c: WorkspaceRequestContext, d: InitiateUploadDto) {
    if (d.size > this.maxSize) throw new BadRequestException('File exceeds workspace upload limit');
    const { name, extension } = (() => {
      const value = this.policy.validateName(d.originalName);
      return { name: value.clean, extension: value.extension };
    })();
    this.policy.validateDeclared(extension, d.declaredMimeType);
    const duplicate = await this.repository.duplicate(
      c.workspaceId,
      d.checksum.toLowerCase(),
      d.size,
    );
    if (duplicate) return { duplicate: true, file: map(duplicate) };
    const folder = this.folder(d.folder),
      storageKey = `${c.workspaceId}/${new Date().toISOString().slice(0, 7)}/${randomUUID()}${extension}`,
      expiresAt = new Date(Date.now() + 900_000),
      file = await this.repository.create({
        workspaceId: new Types.ObjectId(c.workspaceId),
        originalName: name,
        storageKey,
        mimeType: d.declaredMimeType,
        extension,
        size: d.size,
        checksum: d.checksum.toLowerCase(),
        folder,
        tags: d.tags,
        status: 'pending',
        scanStatus: 'pending',
        processingStatus: 'pending',
        createdBy: new Types.ObjectId(c.userId),
        uploadExpiresAt: expiresAt,
        visibility: 'private',
      }),
      upload = await this.storage.get().presignUpload(storageKey, d.declaredMimeType, d.size, 900);
    return { duplicate: false, file: map(file), upload };
  }
  async complete(c: WorkspaceRequestContext, id: string, d: CompleteUploadDto) {
    const file = await this.repository.get(c.workspaceId, id);
    if (file.status !== 'pending') throw new ConflictException('Upload is not pending');
    const provider = this.storage.get(),
      head = await provider.head(file.storageKey);
    if (!head || head.size !== file.size)
      throw new BadRequestException('Uploaded object size does not match');
    const content = await provider.read(file.storageKey, this.maxSize),
      checksum = createHash('sha256').update(content).digest('hex');
    if (checksum !== d.checksum.toLowerCase() || checksum !== file.checksum) {
      await provider.delete(file.storageKey);
      throw new BadRequestException('Checksum validation failed');
    }
    await this.queue.add(
      'file.scan-process',
      { workspaceId: c.workspaceId, fileId: id },
      { jobId: `file-process-${id}`, attempts: 3, backoff: { type: 'exponential', delay: 1000 } },
    );
    return { accepted: true, fileId: id };
  }
  async download(c: WorkspaceRequestContext, id: string) {
    const file = await this.repository.get(c.workspaceId, id);
    if (file.status !== 'active' || file.scanStatus !== 'clean')
      throw new NotFoundException('File is unavailable');
    return { url: await this.storage.get().presignDownload(file.storageKey, 300), expiresIn: 300 };
  }
  async remove(c: WorkspaceRequestContext, id: string) {
    const file = await this.repository.get(c.workspaceId, id);
    if (file.usageReferences.length) throw new ConflictException('File is still in use');
    const value = await this.repository.update(
      c.workspaceId,
      id,
      { status: 'active' },
      { $set: { status: 'deleted', deletedAt: new Date() } },
    );
    if (!value) throw new ConflictException('File cannot be deleted');
    return map(value);
  }
  async restore(c: WorkspaceRequestContext, id: string) {
    const file = await this.repository.get(c.workspaceId, id);
    if (
      file.status !== 'deleted' ||
      !file.deletedAt ||
      file.deletedAt.valueOf() < Date.now() - 30 * 86_400_000
    )
      throw new ConflictException('File restoration window expired');
    if (!(await this.storage.get().head(file.storageKey)))
      throw new NotFoundException('Stored object no longer exists');
    const value = await this.repository.update(
      c.workspaceId,
      id,
      { status: 'deleted' },
      { $set: { status: 'active', deletedAt: null } },
    );
    if (!value) throw new ConflictException('File cannot be restored');
    return map(value);
  }
  async reference(c: WorkspaceRequestContext, id: string, d: UsageReferenceDto) {
    const value = await this.repository.update(
      c.workspaceId,
      id,
      { status: 'active' },
      { $addToSet: { usageReferences: { type: d.type, id: d.id } } },
    );
    if (!value) throw new NotFoundException('File not found');
    return map(value);
  }
  usage(c: WorkspaceRequestContext) {
    return this.repository.usage(c.workspaceId);
  }
  private folder(value: string) {
    if (!value) return '';
    if (value.includes('..') || value.includes('\\') || value.startsWith('/'))
      throw new BadRequestException('Invalid folder');
    return value
      .split('/')
      .filter(Boolean)
      .map((part) => part.replace(/[^\w\- ]/gu, '_'))
      .join('/');
  }
}
