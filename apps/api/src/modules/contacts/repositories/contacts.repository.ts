import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, type ClientSession } from 'mongoose';
import { CrmRepository } from '../../crm/crm.repository.js';
import { Contact, type ContactDocument } from '../schemas/contact.schema.js';
import type { CrmListQueryDto } from '../../crm/crm.dto.js';

@Injectable()
export class ContactsRepository extends CrmRepository<Contact> {
  constructor(@InjectModel(Contact.name) model: Model<ContactDocument>) {
    super(model, new Set(['createdAt', 'updatedAt', 'displayName', 'lifecycleStatus']));
  }
  override page(workspaceId: string, query: CrmListQueryDto) {
    const { status, ...queryWithoutStatus } = query;
    return super.page(
      workspaceId,
      queryWithoutStatus,
      status ? { lifecycleStatus: status } : {},
    );
  }
  findIdentity(workspaceId: string, email: string, phone: string, session: ClientSession) {
    const alternatives: Record<string, unknown>[] = [];
    if (email) alternatives.push({ 'emailAddresses.normalized': email });
    if (phone) alternatives.push({ 'phoneNumbers.normalized': phone });
    if (!alternatives.length) return Promise.resolve(null);
    return this.model
      .findOne({ workspaceId: new Types.ObjectId(workspaceId), deletedAt: null, $or: alternatives })
      .session(session)
      .lean<Contact>()
      .exec();
  }
}
