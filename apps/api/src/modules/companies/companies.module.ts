import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CrmModule } from '../crm/crm.module.js';
import { CompaniesController } from './controllers/companies.controller.js';
import { CompaniesRepository } from './repositories/companies.repository.js';
import { Company, CompanySchema } from './schemas/company.schema.js';
import { CompaniesService } from './services/companies.service.js';
@Module({ imports: [MongooseModule.forFeature([{ name: Company.name, schema: CompanySchema }]), CrmModule], controllers: [CompaniesController], providers: [CompaniesRepository, CompaniesService], exports: [CompaniesRepository] })
export class CompaniesModule {}
