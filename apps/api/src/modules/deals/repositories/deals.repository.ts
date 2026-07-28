import { Injectable } from '@nestjs/common'; import { InjectModel } from '@nestjs/mongoose'; import { Model } from 'mongoose';
import { CrmRepository } from '../../crm/crm.repository.js'; import { Deal, type DealDocument } from '../schemas/deal.schema.js';
@Injectable() export class DealsRepository extends CrmRepository<Deal> {
  constructor(@InjectModel(Deal.name) model: Model<DealDocument>) { super(model, new Set(['createdAt', 'updatedAt', 'value', 'expectedCloseDate', 'probability'])); }
}
