import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import type { Job, Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../../../cache/redis.constants.js';
import { NotificationRepository } from '../repositories/notification.repository.js';
import { NOTIFICATION_DELIVERY_QUEUE } from '../services/notification-orchestrator.service.js';
type Payload = { workspaceId: string; requestId: string; channel: string };
const LIMITS: Record<string, number> = {
  in_app: 1000,
  email: 200,
  sms: 60,
  whatsapp: 60,
  push: 200,
  webhook: 120,
};
@Processor(NOTIFICATION_DELIVERY_QUEUE, { concurrency: 20 })
export class NotificationDeliveryProcessor extends WorkerHost {
  constructor(
    private readonly repository: NotificationRepository,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @InjectQueue(NOTIFICATION_DELIVERY_QUEUE) private readonly queue: Queue,
  ) {
    super();
  }
  async process(job: Job<Payload>) {
    if (job.name === 'digest.tick') {
      const requests = await this.repository.dueDigests();
      for (const request of requests) {
        await this.repository.releaseDigest(String(request._id));
        await this.queue.add(
          'deliver',
          {
            workspaceId: String(request.workspaceId),
            requestId: String(request._id),
            channel: request.channel,
          },
          { jobId: `notification-digest-${String(request._id)}` },
        );
      }
      return { released: requests.length };
    }
    const request = await this.repository.claim(job.data.requestId);
    if (!request) return { duplicate: true };
    const allowed = await this.rateLimit(job.data.workspaceId, request.channel);
    if (!allowed) {
      const deliverAt = new Date(Date.now() + 60_000);
      await this.repository.update(job.data.requestId, { $set: { status: 'deferred', deliverAt } });
      await this.queue.add('deliver', job.data, {
        jobId: `notification-rate-${job.data.requestId}-${Math.floor(Date.now() / 60_000)}`,
        delay: 60_000,
      });
      return { deferred: true };
    }
    try {
      const providerMessageId = await this.send(request.channel, request.destination);
      await Promise.all([
        this.repository.update(job.data.requestId, {
          $set: { status: 'delivered', deliveredAt: new Date(), lastError: null },
        }),
        this.repository.attempt({
          workspaceId: request.workspaceId,
          requestId: request._id,
          channel: request.channel,
          attempt: request.attempts,
          status: 'delivered',
          providerMessageId,
        }),
      ]);
      return { delivered: true };
    } catch (error) {
      const terminal = job.attemptsMade >= 5;
      await Promise.all([
        this.repository.update(job.data.requestId, {
          $set: {
            status: terminal ? 'failed' : 'queued',
            lastError: error instanceof Error ? error.message.slice(0, 500) : 'provider_failed',
          },
        }),
        this.repository.attempt({
          workspaceId: request.workspaceId,
          requestId: request._id,
          channel: request.channel,
          attempt: request.attempts,
          status: 'failed',
          errorCode: 'provider_failed',
        }),
      ]);
      if (terminal && request.channel !== 'in_app' && request.recipientUserId) {
        const fallback = await this.repository.reserve({
          workspaceId: request.workspaceId,
          definitionKey: request.definitionKey,
          channel: 'in_app',
          recipientUserId: request.recipientUserId,
          destination: String(request.recipientUserId),
          deduplicationKey: `${request.deduplicationKey}:fallback`,
          correlationId: request.correlationId,
          content: request.content,
          status: 'queued',
          deliverAt: new Date(),
        });
        if (!fallback.duplicate)
          await this.queue.add(
            'deliver',
            {
              workspaceId: job.data.workspaceId,
              requestId: String(fallback.value._id),
              channel: 'in_app',
            },
            { jobId: `notification-fallback-${String(fallback.value._id)}` },
          );
      }
      throw error;
    }
  }
  private async rateLimit(workspaceId: string, channel: string) {
    const bucket = Math.floor(Date.now() / 60_000),
      key = `tenant:${workspaceId}:notifications:${channel}:${bucket}`;
    const value = await this.redis.incr(key);
    if (value === 1) await this.redis.expire(key, 120);
    return value <= (LIMITS[channel] ?? 60);
  }
  private send(channel: string, destination: string) {
    if (destination.includes('provider-failure'))
      return Promise.reject(new Error(`${channel}_provider_failed`));
    return Promise.resolve(`mock-${channel}-${Date.now()}`);
  }
}
@Injectable()
export class NotificationDigestScheduler implements OnModuleInit {
  constructor(@InjectQueue(NOTIFICATION_DELIVERY_QUEUE) private readonly queue: Queue) {}
  async onModuleInit() {
    await this.queue.upsertJobScheduler(
      'notification-digests',
      { every: 60_000 },
      {
        name: 'digest.tick',
        data: { workspaceId: 'system', requestId: 'digest', channel: 'in_app' },
        opts: { removeOnComplete: 10, removeOnFail: 10 },
      },
    );
  }
}
