import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomUUID } from 'node:crypto';
import { Types, type ClientSession, type Model } from 'mongoose';
import { EventRedactor } from './event-redactor.service.js';
import { OutboxEvent, type OutboxEventDocument } from './schemas/event-store.schemas.js';
export interface AppendOutboxEvent {
  eventId?: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  workspaceId: string;
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  correlationId: string;
  causationId?: string;
  occurredAt?: Date;
  availableAt?: Date;
}
@Injectable()
export class OutboxService {
  constructor(
    @InjectModel(OutboxEvent.name) private readonly events: Model<OutboxEventDocument>,
    private readonly redactor: EventRedactor,
  ) {}
  async append(input: AppendOutboxEvent, session?: ClientSession) {
    const event = new this.events({
      eventId: input.eventId ?? randomUUID(),
      eventType: input.eventType,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      workspaceId: new Types.ObjectId(input.workspaceId),
      payload: this.redactor.redact(input.payload ?? {}) as Record<string, unknown>,
      metadata: this.redactor.redact(input.metadata ?? {}) as Record<string, unknown>,
      correlationId: input.correlationId,
      causationId: input.causationId ?? null,
      occurredAt: input.occurredAt ?? new Date(),
      availableAt: input.availableAt ?? new Date(),
      status: 'pending',
      attempts: 0,
    });
    await event.save(session ? { session } : {});
    return event.toObject();
  }
  async claim() {
    return this.events
      .findOneAndUpdate(
        { status: { $in: ['pending', 'failed'] }, availableAt: { $lte: new Date() } },
        { $set: { status: 'publishing' }, $inc: { attempts: 1 } },
        { new: true, sort: { occurredAt: 1 } },
      )
      .lean<OutboxEvent>()
      .exec();
  }
  processed(eventId: string) {
    return this.events.updateOne(
      { eventId, status: 'publishing' },
      { $set: { status: 'processed', processedAt: new Date(), lastError: null } },
    );
  }
  async failed(eventId: string, error: unknown, attempts: number) {
    const quarantine = attempts >= 10,
      delay = Math.min(3_600_000, 1000 * 2 ** Math.min(attempts, 12));
    return this.events.updateOne(
      { eventId },
      {
        $set: {
          status: quarantine ? 'quarantined' : 'failed',
          lastError:
            error instanceof Error ? error.message.slice(0, 2000) : String(error).slice(0, 2000),
          availableAt: new Date(Date.now() + delay),
        },
      },
    );
  }
  replay(eventId: string) {
    return this.events.updateOne(
      { eventId, status: { $in: ['processed', 'quarantined', 'failed'] } },
      {
        $set: { status: 'pending', availableAt: new Date(), processedAt: null, lastError: null },
        $setOnInsert: { attempts: 0 },
      },
    );
  }
  async metrics() {
    const now = new Date(),
      [pending, delayed, failed, quarantined] = await Promise.all([
        this.events.countDocuments({ status: 'pending', availableAt: { $lte: now } }),
        this.events.countDocuments({
          status: { $in: ['pending', 'failed'] },
          availableAt: { $gt: now },
        }),
        this.events.countDocuments({ status: 'failed' }),
        this.events.countDocuments({ status: 'quarantined' }),
      ]);
    return { pending, delayed, failed, quarantined };
  }
  retained(workspaceId: string) {
    return this.events
      .find({ workspaceId: new Types.ObjectId(workspaceId) })
      .sort({ occurredAt: 1, _id: 1 })
      .lean<OutboxEvent>()
      .cursor();
  }
}
