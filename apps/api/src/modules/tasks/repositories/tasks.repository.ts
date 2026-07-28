import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { CrmRepository } from '../../crm/crm.repository.js';
import { Task, type TaskDocument } from '../schemas/task.schema.js';
@Injectable()
export class TasksRepository extends CrmRepository<Task> {
  constructor(@InjectModel(Task.name) m: Model<TaskDocument>) {
    super(m, new Set(['createdAt', 'dueAt', 'priority', 'status']));
  }
}
