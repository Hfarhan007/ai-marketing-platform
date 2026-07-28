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
}
