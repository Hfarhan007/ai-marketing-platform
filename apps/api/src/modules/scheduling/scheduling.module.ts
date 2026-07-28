import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { CrmModule } from '../crm/crm.module.js';
import { CacheModule } from '../../cache/cache.module.js';
import { SchedulingLockService } from './scheduling-lock.service.js';
import { SCHEDULING_QUEUE, SchedulingJobsService } from './scheduling-jobs.service.js';
@Module({
  imports: [BullModule.registerQueue({ name: SCHEDULING_QUEUE }), CrmModule, CacheModule],
  providers: [SchedulingJobsService, SchedulingLockService],
  exports: [SchedulingJobsService, SchedulingLockService, CrmModule],
})
export class SchedulingModule {}
