import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SchedulingModule } from '../scheduling/scheduling.module.js';
import { TasksController } from './controllers/tasks.controller.js';
import { TasksRepository } from './repositories/tasks.repository.js';
import { Task, TaskSchema } from './schemas/task.schema.js';
import { TasksService } from './services/tasks.service.js';
@Module({ imports: [MongooseModule.forFeature([{ name: Task.name, schema: TaskSchema }]), SchedulingModule], controllers: [TasksController], providers: [TasksRepository, TasksService], exports: [TasksRepository] })
export class TasksModule {}
