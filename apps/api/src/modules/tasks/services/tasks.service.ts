import { Injectable } from '@nestjs/common';
import type { WorkspaceRequestContext } from '../../../common/types/workspace-context.js';
import { CrmCrudService } from '../../crm/crud.service.js';
import { CrmEventService } from '../../crm/crm-event.service.js';
import { CrmJobsService } from '../../crm/crm-jobs.service.js';
import { CustomFieldService } from '../../custom-fields/custom-field.service.js';
import { SchedulingJobsService } from '../../scheduling/scheduling-jobs.service.js';
import { assertTimeZone } from '../../scheduling/time.js';
import { CreateTaskDto, UpdateTaskDto } from '../dto/task.dto.js';
import { TasksRepository } from '../repositories/tasks.repository.js';
import type { Task } from '../schemas/task.schema.js';

const map = (value: Task) => ({
  id: String(value._id),
  title: value.title,
  description: value.description,
  status: value.status,
  priority: value.priority,
  dueAt: value.dueAt,
  timezone: value.timezone,
  reminders: value.reminders,
  ownerId: value.ownerId ? String(value.ownerId) : null,
  contactId: value.contactId ? String(value.contactId) : null,
  companyId: value.companyId ? String(value.companyId) : null,
  dealId: value.dealId ? String(value.dealId) : null,
  checklist: value.checklist,
  parentTaskId: value.parentTaskId ? String(value.parentTaskId) : null,
  subtaskIds: value.subtaskIds.map(String),
  recurrence: value.recurrence,
  completionHistory: value.completionHistory,
  customFields: value.customFields,
  version: value.version,
  createdAt: value.createdAt,
  updatedAt: value.updatedAt,
});

@Injectable()
export class TasksService extends CrmCrudService<Task, CreateTaskDto, UpdateTaskDto> {
  constructor(
    repository: TasksRepository,
    events: CrmEventService,
    jobs: CrmJobsService,
    private readonly scheduling: SchedulingJobsService,
    private readonly fields: CustomFieldService,
  ) {
    super(repository, events, jobs, 'tasks', map);
  }
  protected override prepare(dto: CreateTaskDto) {
    assertTimeZone(dto.timezone);
    return dto;
  }
  override async create(context: WorkspaceRequestContext, dto: CreateTaskDto) {
    const customFields = await this.fields.validateValues(
      context.workspaceId,
      'tasks',
      dto.customFields,
    );
    const value = await super.create(context, { ...dto, customFields });
    if (dto.recurrence && dto.dueAt)
      await this.scheduling.recurringTask(
        context.workspaceId,
        String((value as { id: string }).id),
        dto.dueAt,
      );
    return value;
  }
  override async update(context: WorkspaceRequestContext, id: string, dto: UpdateTaskDto) {
    const customFields = await this.fields.validateValues(
      context.workspaceId,
      'tasks',
      dto.customFields,
    );
    return super.update(context, id, { ...dto, customFields });
  }
}
