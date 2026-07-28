import { Injectable } from '@nestjs/common'; import { InjectModel } from '@nestjs/mongoose'; import { Model } from 'mongoose';
import { CrmRepository } from '../../crm/crm.repository.js'; import { Company, type CompanyDocument } from '../schemas/company.schema.js';
@Injectable() export class CompaniesRepository extends CrmRepository<Company> {
  constructor(@InjectModel(Company.name) model: Model<CompanyDocument>) { super(model, new Set(['createdAt', 'updatedAt', 'name', 'industry'])); }
}
