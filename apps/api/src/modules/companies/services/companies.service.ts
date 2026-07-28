import { ConflictException, Injectable } from '@nestjs/common';
import type { WorkspaceRequestContext } from '../../../common/types/workspace-context.js';
import { CrmCrudService } from '../../crm/crud.service.js';
import { CrmEventService } from '../../crm/crm-event.service.js';
import { CrmJobsService } from '../../crm/crm-jobs.service.js';
import { mapCompany } from '../../crm/crm.mappers.js';
import { CreateCompanyDto, UpdateCompanyDto } from '../dto/company.dto.js';
import { CompaniesRepository } from '../repositories/companies.repository.js';
import type { Company } from '../schemas/company.schema.js';
@Injectable()
export class CompaniesService extends CrmCrudService<Company, CreateCompanyDto, UpdateCompanyDto> {
  constructor(repository: CompaniesRepository, events: CrmEventService, jobs: CrmJobsService) { super(repository, events, jobs, 'companies', mapCompany); }
  override async create(context: WorkspaceRequestContext, dto: CreateCompanyDto) {
    if (dto.domain && await this.repository.findOne(context.workspaceId, { domain: dto.domain.trim().toLowerCase(), deletedAt: null })) throw new ConflictException('Company domain already exists');
    return super.create(context, dto);
  }
  protected override prepare(dto: CreateCompanyDto) { return { ...dto, domain: dto.domain.trim().toLowerCase() }; }
}
