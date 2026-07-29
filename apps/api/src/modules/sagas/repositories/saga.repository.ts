import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model, UpdateQuery } from 'mongoose';
import { Types } from 'mongoose';
import { Saga, SagaAlert } from '../schemas/saga.schema.js';

@Injectable()
export class SagaRepository {
  constructor(
    @InjectModel(Saga.name) private readonly sagas: Model<Saga>,
    @InjectModel(SagaAlert.name) private readonly alerts: Model<SagaAlert>,
  ) {}

  async create(input: {
    workspaceId: string;
    type: string;
    correlationId: string;
    payload: Record<string, unknown>;
    timeoutAt: Date;
    currentStep: string;
  }) {
    const existing = await this.sagas
      .findOne({
        workspaceId: new Types.ObjectId(input.workspaceId),
        correlationId: input.correlationId,
      })
      .lean<Saga>()
      .exec();
    if (existing) return { saga: existing, duplicate: true };
    const now = new Date();
    const saga = await new this.sagas({
      ...input,
      workspaceId: new Types.ObjectId(input.workspaceId),
      status: 'pending',
      completedSteps: [],
      compensationSteps: [],
      stepAttempts: {},
      version: 0,
      lastProgressAt: now,
      auditHistory: [{ at: now, action: 'created', actor: 'system' }],
    }).save();
    return { saga: saga.toObject(), duplicate: false };
  }

  get(workspaceId: string, sagaId: string) {
    return this.sagas
      .findOne({ _id: new Types.ObjectId(sagaId), workspaceId: new Types.ObjectId(workspaceId) })
      .lean<Saga>()
      .exec();
  }

  async transition(
    saga: Saga,
    update: UpdateQuery<Saga>,
    audit: Record<string, unknown>,
    filter: Record<string, unknown> = {},
  ) {
    const now = new Date();
    const value = await this.sagas
      .findOneAndUpdate(
        { _id: saga._id, workspaceId: saga.workspaceId, version: saga.version, ...filter },
        {
          ...update,
          $inc: { ...(update.$inc as object | undefined), version: 1 },
          $set: { ...(update.$set as object | undefined), lastProgressAt: now },
          $push: {
            ...(update.$push as object | undefined),
            auditHistory: { at: now, ...audit },
          },
        },
        { new: true },
      )
      .lean<Saga>()
      .exec();
    if (!value) throw new ConflictException('Saga state changed concurrently');
    return value;
  }

  stuck(before: Date, limit = 100) {
    return this.sagas
      .find({
        status: { $in: ['running', 'waiting_retry', 'waiting_external', 'compensating'] },
        lastProgressAt: { $lt: before },
      })
      .sort({ lastProgressAt: 1 })
      .limit(limit)
      .lean<Saga[]>()
      .exec();
  }

  alert(saga: Saga, kind: string, message: string) {
    return this.alerts.updateOne(
      { sagaId: saga._id, kind },
      {
        $setOnInsert: {
          workspaceId: saga.workspaceId,
          sagaId: saga._id,
          kind,
          message,
          acknowledgedAt: null,
        },
      },
      { upsert: true },
    );
  }

  async metrics(workspaceId?: string) {
    const match = workspaceId ? { workspaceId: new Types.ObjectId(workspaceId) } : {};
    const now = new Date();
    const [byStatus, byType, overdue, unacknowledgedAlerts] = await Promise.all([
      this.sagas
        .aggregate<{ _id: string; count: number }>([
          { $match: match },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ])
        .exec(),
      this.sagas
        .aggregate<{ _id: string; count: number }>([
          { $match: match },
          { $group: { _id: '$type', count: { $sum: 1 } } },
        ])
        .exec(),
      this.sagas.countDocuments({
        ...match,
        status: { $nin: ['completed', 'cancelled', 'manual_intervention'] },
        timeoutAt: { $lte: now },
      }),
      this.alerts.countDocuments({
        ...(workspaceId ? { workspaceId: new Types.ObjectId(workspaceId) } : {}),
        acknowledgedAt: null,
      }),
    ]);
    return {
      byStatus: Object.fromEntries(byStatus.map((row) => [row._id, row.count])),
      byType: Object.fromEntries(byType.map((row) => [row._id, row.count])),
      overdue,
      unacknowledgedAlerts,
    };
  }
}
