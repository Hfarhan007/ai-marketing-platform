import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';

export const SCHEDULING_QUEUE = 'scheduling';
@Injectable()
export class SchedulingJobsService {
  constructor(@InjectQueue(SCHEDULING_QUEUE) private readonly queue: Queue) {}
  async reminders(workspaceId: string, appointmentId: string, reminders: readonly number[], start: Date): Promise<void> {
    await Promise.all(reminders.map((minutes) => this.queue.add('appointment.reminder', {
      workspaceId, appointmentId, minutes,
    }, {
      jobId: `appointment-${appointmentId}-reminder-${minutes}`,
      delay: Math.max(0, start.valueOf() - minutes * 60_000 - Date.now()),
    })));
  }
  async recurringTask(workspaceId: string, taskId: string, runAt: Date): Promise<void> {
    await this.queue.add('task.recur', { workspaceId, taskId }, {
      jobId: `task-${taskId}-recur-${runAt.toISOString()}`,
      delay: Math.max(0, runAt.valueOf() - Date.now()),
    });
  }
}
