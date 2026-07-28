import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createHash } from 'node:crypto';
import { Types, type Model } from 'mongoose';
import { EventProcessingFailure, InboxEvent } from './schemas/event-store.schemas.js';
export interface ConsumedEvent {
  eventId: string;
  workspaceId: string;
  payload: Record<string, unknown>;
}
@Injectable()
export class InboxService {
  constructor(
    @InjectModel(InboxEvent.name) private readonly inbox: Model<InboxEvent>,
    @InjectModel(EventProcessingFailure.name)
    private readonly failures: Model<EventProcessingFailure>,
  ) {}
  async consume<T>(
    consumerName: string,
    event: ConsumedEvent,
    handler: () => Promise<T>,
  ): Promise<{ duplicate: boolean; value?: T }> {
    const hash = createHash('sha256').update(JSON.stringify(event.payload)).digest('hex');
    try {
      await new this.inbox({
        consumerName,
        eventId: event.eventId,
        workspaceId: new Types.ObjectId(event.workspaceId),
        receivedAt: new Date(),
        status: 'processing',
        payloadHash: hash,
      }).save();
    } catch (error: unknown) {
      if ((error as { code?: number }).code === 11000) return { duplicate: true };
      throw error;
    }
    try {
      const value = await handler();
      await this.inbox.updateOne(
        { consumerName, eventId: event.eventId },
        { $set: { status: 'processed', processedAt: new Date() } },
      );
      return { duplicate: false, value };
    } catch (error: unknown) {
      const attempt =
          (await this.failures.countDocuments({ consumerName, eventId: event.eventId })) + 1,
        quarantined = attempt >= 10;
      await Promise.all([
        this.inbox.updateOne(
          { consumerName, eventId: event.eventId },
          { $set: { status: 'failed' } },
        ),
        new this.failures({
          consumerName,
          eventId: event.eventId,
          workspaceId: new Types.ObjectId(event.workspaceId),
          error: error instanceof Error ? error.message.slice(0, 2000) : String(error),
          attempt,
          status: quarantined ? 'quarantined' : 'retryable',
          nextAttemptAt: new Date(Date.now() + Math.min(3_600_000, 1000 * 2 ** attempt)),
        }).save(),
      ]);
      if (!quarantined)
        await this.inbox.deleteOne({ consumerName, eventId: event.eventId, status: 'failed' });
      throw error;
    }
  }
}
