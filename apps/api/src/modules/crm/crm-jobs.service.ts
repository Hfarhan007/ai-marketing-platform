import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';

export const CRM_DATA_QUEUE = 'crm-data';
type EntityType =
  | 'contacts'
  | 'companies'
  | 'leads'
  | 'deals'
  | 'pipelines'
  | 'tasks'
  | 'services'
  | 'availability'
  | 'booking-links';

@Injectable()
export class CrmJobsService {
  constructor(@InjectQueue(CRM_DATA_QUEUE) private readonly queue: Queue) {}

  async create(
    kind: 'import' | 'export',
    entity: EntityType,
    workspaceId: string,
    actorId: string,
    options: Record<string, string | number | boolean>,
  ): Promise<{ jobId: string }> {
    const idempotencyKey = `${kind}:${entity}:${workspaceId}:${actorId}:${String(options.idempotencyKey ?? Date.now())}`;
    const job = await this.queue.add(
      `${entity}.${kind}`,
      {
        workspaceId,
        actorId,
        entity,
        options,
      },
      { jobId: idempotencyKey.replaceAll(':', '-') },
    );
    return { jobId: String(job.id) };
  }
}
