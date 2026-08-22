import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CrmRepository } from '../../crm/crm.repository.js';
import { Lead, type LeadDocument } from '../schemas/lead.schema.js';
@Injectable()
export class LeadsRepository extends CrmRepository<Lead> {
  constructor(@InjectModel(Lead.name) model: Model<LeadDocument>) {
    super(model, new Set(['createdAt', 'updatedAt', 'score', 'status', 'followUpAt']));
  }

  findExternal(workspaceId: string, provider: string, externalLeadId: string) {
    return this.findOne(workspaceId, { externalProvider: provider, externalLeadId, deletedAt: null });
  }

  findIdentity(workspaceId: string, normalizedEmail: string, normalizedPhone: string) {
    const identities = [
      ...(normalizedEmail ? [{ normalizedEmail }] : []),
      ...(normalizedPhone ? [{ normalizedPhone }] : []),
    ];
    if (identities.length === 0) return Promise.resolve(null);
    return this.findOne(workspaceId, { deletedAt: null, $or: identities });
  }
}
