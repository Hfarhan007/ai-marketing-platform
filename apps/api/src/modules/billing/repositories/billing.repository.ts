import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types, type ClientSession, type Model } from 'mongoose';
import {
  BillingCustomer,
  BillingPlan,
  BillingWebhookEvent,
  Subscription,
  UsageRecord,
  UsageSnapshot,
  type UsageCategory,
} from '../schemas/billing.schemas.js';

@Injectable()
export class BillingRepository {
  constructor(
    @InjectModel(BillingPlan.name) private readonly plans: Model<BillingPlan>,
    @InjectModel(BillingCustomer.name) private readonly customers: Model<BillingCustomer>,
    @InjectModel(Subscription.name) private readonly subscriptions: Model<Subscription>,
    @InjectModel(UsageRecord.name) private readonly usageRecords: Model<UsageRecord>,
    @InjectModel(UsageSnapshot.name) private readonly snapshots: Model<UsageSnapshot>,
    @InjectModel(BillingWebhookEvent.name) private readonly webhooks: Model<BillingWebhookEvent>,
  ) {}
  listPlans() {
    return this.plans.find({ active: true }).sort({ monthlyPrice: 1 }).lean<BillingPlan[]>().exec();
  }
  async plan(id: string) {
    const value = await this.plans
      .findOne({ _id: new Types.ObjectId(id), active: true })
      .lean<BillingPlan>()
      .exec();
    if (!value) throw new NotFoundException('Plan not found');
    return value;
  }
  customer(workspaceId: string) {
    return this.customers
      .findOne({ workspaceId: new Types.ObjectId(workspaceId) })
      .lean<BillingCustomer>()
      .exec();
  }
  createCustomer(value: object) {
    return new this.customers(value).save();
  }
  subscription(workspaceId: string) {
    return this.subscriptions
      .findOne({ workspaceId: new Types.ObjectId(workspaceId) })
      .lean<Subscription>()
      .exec();
  }
  createSubscription(value: object, session?: ClientSession) {
    return new this.subscriptions(value).save(session ? { session } : {});
  }
  updateSubscription(
    workspaceId: string,
    version: number,
    update: object,
    session?: ClientSession,
  ) {
    return this.subscriptions
      .findOneAndUpdate(
        { workspaceId: new Types.ObjectId(workspaceId), version },
        { $set: update, $inc: { version: 1 } },
        { new: true, ...(session ? { session } : {}) },
      )
      .lean<Subscription>()
      .exec();
  }
  async addUsage(
    workspaceId: string,
    category: UsageCategory,
    quantity: number,
    idempotencyKey: string,
    metadata: Record<string, string> = {},
  ) {
    try {
      return await new this.usageRecords({
        workspaceId: new Types.ObjectId(workspaceId),
        category,
        quantity,
        idempotencyKey,
        metadata,
        occurredAt: new Date(),
      }).save();
    } catch (error: unknown) {
      if ((error as { code?: number }).code === 11000) return null;
      throw error;
    }
  }
  async usage(workspaceId: string, start: Date, end: Date) {
    const rows = await this.usageRecords.aggregate<{ _id: UsageCategory; total: number }>([
      {
        $match: {
          workspaceId: new Types.ObjectId(workspaceId),
          occurredAt: { $gte: start, $lt: end },
        },
      },
      { $group: { _id: '$category', total: { $sum: '$quantity' } } },
    ]);
    return Object.fromEntries(rows.map((v) => [v._id, v.total])) as Partial<
      Record<UsageCategory, number>
    >;
  }
  snapshot(value: object) {
    return this.snapshots
      .findOneAndUpdate(
        {
          workspaceId: (value as { workspaceId: Types.ObjectId }).workspaceId,
          periodStart: (value as { periodStart: Date }).periodStart,
          periodEnd: (value as { periodEnd: Date }).periodEnd,
        },
        { $setOnInsert: value },
        { upsert: true, new: true },
      )
      .lean<UsageSnapshot>()
      .exec();
  }
  async claimWebhook(id: string, type: string) {
    try {
      await new this.webhooks({ providerEventId: id, type }).save();
      return true;
    } catch (error: unknown) {
      if ((error as { code?: number }).code === 11000) return false;
      throw error;
    }
  }
  completeWebhook(id: string, status: 'processed' | 'failed', error?: string) {
    return this.webhooks.updateOne(
      { providerEventId: id },
      { $set: { status, processedAt: new Date(), ...(error ? { error } : {}) } },
    );
  }
}
