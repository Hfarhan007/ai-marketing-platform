import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import type { ClientSession } from 'mongoose';
import { CrmEventService } from '../../crm/crm-event.service.js';
import { CrmJobsService } from '../../crm/crm-jobs.service.js';
import type { CrmListQueryDto } from '../../crm/crm.dto.js';
import { TransactionManagerService } from '../../../database/transactions/transaction-manager.service.js';
import type { WorkspaceRequestContext } from '../../../common/types/workspace-context.js';
import { CreateContactDto, MergeContactsDto, UpdateContactDto } from '../dto/contact.dto.js';
import { mapContact } from '../mappers/contact.mapper.js';
import { ContactsRepository } from '../repositories/contacts.repository.js';
import type { Contact } from '../schemas/contact.schema.js';

const normalizeEmail = (value: string) => value.trim().toLocaleLowerCase('en-US');
const normalizePhone = (value: string) => value.replace(/[^\d+]/g, '');
const prepare = (dto: CreateContactDto) => ({
  ...dto,
  emailAddresses: dto.emailAddresses.map((point) => ({ ...point, normalized: normalizeEmail(point.value) })),
  phoneNumbers: dto.phoneNumbers.map((point) => ({ ...point, normalized: normalizePhone(point.value) })),
});

@Injectable()
export class ContactsService {
  constructor(
    private readonly repository: ContactsRepository,
    private readonly transactions: TransactionManagerService,
    private readonly events: CrmEventService,
    private readonly jobs: CrmJobsService,
  ) {}

  async list(context: WorkspaceRequestContext, query: CrmListQueryDto) {
    const page = await this.repository.page(context.workspaceId, query);
    return { ...page, items: page.items.map(mapContact) };
  }
  async get(context: WorkspaceRequestContext, id: string) {
    return mapContact(await this.repository.getActive(context.workspaceId, id));
  }
  async create(context: WorkspaceRequestContext, dto: CreateContactDto) {
    await this.assertNoDuplicate(context.workspaceId, dto);
    const value = await this.repository.createEntity(context.workspaceId, context.userId, prepare(dto));
    await this.record(context, value, 'created');
    return mapContact(value);
  }
  async update(context: WorkspaceRequestContext, id: string, dto: UpdateContactDto) {
    await this.assertNoDuplicate(context.workspaceId, dto, id);
    const { version, ...input } = dto;
    const value = await this.repository.updateEntity(context.workspaceId, id, context.userId, version, prepare(input));
    await this.record(context, value, 'updated');
    return mapContact(value);
  }
  async remove(context: WorkspaceRequestContext, id: string, version: number) {
    const value = await this.repository.softDelete(context.workspaceId, id, context.userId, version);
    await this.record(context, value, 'deleted');
    return mapContact(value);
  }
  async restore(context: WorkspaceRequestContext, id: string, version: number) {
    const value = await this.repository.restore(context.workspaceId, id, context.userId, version);
    await this.record(context, value, 'restored');
    return mapContact(value);
  }
  async merge(context: WorkspaceRequestContext, dto: MergeContactsDto) {
    if (dto.sourceId === dto.targetId) throw new BadRequestException('Source and target must differ');
    const result = await this.transactions.run(async (session) => {
      const [source, target] = await Promise.all([
        this.repository.getActive(context.workspaceId, dto.sourceId, session),
        this.repository.getActive(context.workspaceId, dto.targetId, session),
      ]);
      const merged = await this.repository.updateEntity(context.workspaceId, dto.targetId, context.userId, dto.targetVersion, {
        tags: [...new Set([...target.tags, ...source.tags])],
        companyIds: [...new Set([...target.companyIds.map(String), ...source.companyIds.map(String)])],
        emailAddresses: this.uniquePoints([...target.emailAddresses, ...source.emailAddresses]),
        phoneNumbers: this.uniquePoints([...target.phoneNumbers, ...source.phoneNumbers]),
      }, session);
      await this.repository.updateEntity(context.workspaceId, dto.sourceId, context.userId, dto.sourceVersion, {
        deletedAt: new Date(),
        mergedIntoId: target._id,
      }, session);
      await this.record(context, merged, 'merged', session, { sourceId: dto.sourceId });
      return merged;
    });
    return mapContact(result);
  }
  createJob(kind: 'import' | 'export', context: WorkspaceRequestContext, options: Record<string, string | number | boolean>) {
    return this.jobs.create(kind, 'contacts', context.workspaceId, context.userId, options);
  }
  async bulk(context: WorkspaceRequestContext, items: readonly { id: string; version: number }[], action: 'delete' | 'restore') {
    const results = await Promise.allSettled(items.map((item) =>
      action === 'delete' ? this.remove(context, item.id, item.version) : this.restore(context, item.id, item.version),
    ));
    return results.map((result, index) => result.status === 'fulfilled'
      ? { id: items[index]?.id, success: true }
      : { id: items[index]?.id, success: false, error: 'Resource changed or unavailable' });
  }
  private async assertNoDuplicate(workspaceId: string, dto: CreateContactDto, ignoredId?: string) {
    const emails = dto.emailAddresses.map((point) => normalizeEmail(point.value));
    const phones = dto.phoneNumbers.map((point) => normalizePhone(point.value));
    if (!emails.length && !phones.length) return;
    const filter: Record<string, unknown> = { deletedAt: null, $or: [] };
    const alternatives = filter.$or as Record<string, unknown>[];
    if (emails.length) alternatives.push({ 'emailAddresses.normalized': { $in: emails } });
    if (phones.length) alternatives.push({ 'phoneNumbers.normalized': { $in: phones } });
    if (ignoredId) filter._id = { $ne: ignoredId };
    if (await this.repository.findOne(workspaceId, filter)) throw new ConflictException('A possible duplicate contact exists');
  }
  private uniquePoints(points: Contact['emailAddresses']) {
    return [...new Map(points.map((point) => [point.normalized, point])).values()];
  }
  private record(context: WorkspaceRequestContext, entity: Contact, action: string, session?: ClientSession, metadata?: Record<string, string>) {
    return this.events.record({
      workspaceId: context.workspaceId,
      actorId: context.userId,
      entityType: 'contact',
      entityId: String(entity._id),
      action,
      ...(session ? { session } : {}),
      ...(metadata ? { metadata } : {}),
    });
  }
}
