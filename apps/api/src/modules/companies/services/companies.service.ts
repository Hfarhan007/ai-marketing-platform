import { ConflictException, Injectable } from '@nestjs/common';
import type { WorkspaceRequestContext } from '../../../common/types/workspace-context.js';
import { CrmCrudService } from '../../crm/crud.service.js';
import { CrmEventService } from '../../crm/crm-event.service.js';
import { CrmJobsService } from '../../crm/crm-jobs.service.js';
import { mapCompany } from '../../crm/crm.mappers.js';
import { CreateCompanyDto, UpdateCompanyDto } from '../dto/company.dto.js';
import { CompaniesRepository } from '../repositories/companies.repository.js';
import type { Company } from '../schemas/company.schema.js';
import { CompanyPolicy } from '../../crm/domain/company-policy.js';
import { CustomFieldService } from '../../custom-fields/custom-field.service.js';
@Injectable()
export class CompaniesService extends CrmCrudService<Company, CreateCompanyDto, UpdateCompanyDto> {
  private readonly policy = new CompanyPolicy();
  constructor(
    repository: CompaniesRepository,
    events: CrmEventService,
    jobs: CrmJobsService,
    private readonly fields: CustomFieldService,
  ) {
    super(repository, events, jobs, 'companies', mapCompany);
  }
  override async create(context: WorkspaceRequestContext, dto: CreateCompanyDto) {
    const domain = this.policy.normalizeDomain(dto.domain);
    if (domain && (await this.repository.findOne(context.workspaceId, { domain, deletedAt: null })))
      throw new ConflictException('Company domain already exists');
    const customFields = await this.fields.validateValues(
      context.workspaceId,
      'companies',
      dto.customFields,
    );
    return super.create(context, { ...dto, customFields });
  }
  override async update(context: WorkspaceRequestContext, id: string, dto: UpdateCompanyDto) {
    try {
      this.policy.assertParent(id, dto.parentCompanyId);
    } catch (error) {
      throw new ConflictException(
        error instanceof Error ? error.message : 'Invalid parent company',
      );
    }
    const customFields = await this.fields.validateValues(
      context.workspaceId,
      'companies',
      dto.customFields,
    );
    return super.update(context, id, { ...dto, customFields });
  }
  protected override prepare(dto: CreateCompanyDto) {
    return { ...dto, domain: this.policy.normalizeDomain(dto.domain) };
  }
}
