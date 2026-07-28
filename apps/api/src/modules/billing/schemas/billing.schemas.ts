import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types, type HydratedDocument } from 'mongoose';

export const USAGE_CATEGORIES = [
  'contacts',
  'users',
  'email_deliveries',
  'sms',
  'whatsapp',
  'ai_tokens',
  'ai_cost',
  'storage',
  'workflow_executions',
  'api_requests',
] as const;
export type UsageCategory = (typeof USAGE_CATEGORIES)[number];
export type BillingInterval = 'month' | 'year';
export type SubscriptionStatus =
  'trialing' | 'active' | 'past_due' | 'grace_period' | 'cancelled' | 'expired';

@Schema({ collection: 'billing_plans', timestamps: true, versionKey: false })
export class BillingPlan {
  _id!: Types.ObjectId;
  createdAt!: Date;
  updatedAt!: Date;
  @Prop({ type: String, required: true, unique: true }) code!: string;
  @Prop({ type: String, required: true }) name!: string;
  @Prop({ type: String, default: '' }) description!: string;
  @Prop({ type: Number, required: true, min: 0 }) monthlyPrice!: number;
  @Prop({ type: Number, required: true, min: 0 }) yearlyPrice!: number;
  @Prop({ type: String, default: 'usd' }) currency!: string;
  @Prop({ type: Number, default: 0, min: 0 }) trialDays!: number;
  @Prop({ type: MongooseSchema.Types.Mixed, required: true }) limits!: Record<
    UsageCategory,
    number
  >;
  @Prop({ type: [String], default: [] }) features!: string[];
  @Prop({ type: Boolean, default: true }) active!: boolean;
  @Prop({ type: String }) stripeMonthlyPriceId?: string;
  @Prop({ type: String }) stripeYearlyPriceId?: string;
}
export const BillingPlanSchema = SchemaFactory.createForClass(BillingPlan);
export type BillingPlanDocument = HydratedDocument<BillingPlan>;

@Schema({ collection: 'billing_customers', timestamps: true, versionKey: false })
export class BillingCustomer {
  _id!: Types.ObjectId;
  createdAt!: Date;
  updatedAt!: Date;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, unique: true })
  workspaceId!: Types.ObjectId;
  @Prop({ type: String, required: true }) providerCustomerId!: string;
  @Prop({ type: String, required: true }) email!: string;
  @Prop({ type: String, default: '' }) name!: string;
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} }) billingContact!: Record<string, string>;
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} }) taxInformation!: Record<string, string>;
}
export const BillingCustomerSchema = SchemaFactory.createForClass(BillingCustomer);

@Schema({ collection: 'subscriptions', timestamps: true, versionKey: false })
export class Subscription {
  _id!: Types.ObjectId;
  createdAt!: Date;
  updatedAt!: Date;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, unique: true })
  workspaceId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) planId!: Types.ObjectId;
  @Prop({ type: String, required: true }) providerSubscriptionId!: string;
  @Prop({ type: String, enum: ['month', 'year'], required: true }) interval!: BillingInterval;
  @Prop({
    type: String,
    enum: ['trialing', 'active', 'past_due', 'grace_period', 'cancelled', 'expired'],
    required: true,
  })
  status!: SubscriptionStatus;
  @Prop({ type: Date, required: true }) currentPeriodStart!: Date;
  @Prop({ type: Date, required: true }) currentPeriodEnd!: Date;
  @Prop({ type: Date }) trialEndsAt?: Date;
  @Prop({ type: Date }) graceEndsAt?: Date;
  @Prop({ type: Boolean, default: false }) cancelAtPeriodEnd!: boolean;
  @Prop({ type: Date }) cancelledAt?: Date;
  @Prop({ type: MongooseSchema.Types.ObjectId }) scheduledPlanId?: Types.ObjectId;
  @Prop({ type: Number, default: 0 }) version!: number;
  @Prop({ type: String }) couponCode?: string;
}
export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);
export type SubscriptionDocument = HydratedDocument<Subscription>;

@Schema({ collection: 'billing_usage', timestamps: true, versionKey: false })
export class UsageRecord {
  _id!: Types.ObjectId;
  createdAt!: Date;
  updatedAt!: Date;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: String, enum: USAGE_CATEGORIES, required: true }) category!: UsageCategory;
  @Prop({ type: Number, required: true }) quantity!: number;
  @Prop({ type: Date, required: true }) occurredAt!: Date;
  @Prop({ type: String, required: true }) idempotencyKey!: string;
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} }) metadata!: Record<string, string>;
}
export const UsageRecordSchema = SchemaFactory.createForClass(UsageRecord);

@Schema({ collection: 'billing_usage_snapshots', timestamps: true, versionKey: false })
export class UsageSnapshot {
  _id!: Types.ObjectId;
  createdAt!: Date;
  updatedAt!: Date;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: Date, required: true }) periodStart!: Date;
  @Prop({ type: Date, required: true }) periodEnd!: Date;
  @Prop({ type: MongooseSchema.Types.Mixed, required: true }) totals!: Record<
    UsageCategory,
    number
  >;
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} }) overages!: Partial<
    Record<UsageCategory, number>
  >;
}
export const UsageSnapshotSchema = SchemaFactory.createForClass(UsageSnapshot);

@Schema({ collection: 'billing_webhook_events', timestamps: true, versionKey: false })
export class BillingWebhookEvent {
  _id!: Types.ObjectId;
  createdAt!: Date;
  updatedAt!: Date;
  @Prop({ type: String, required: true, unique: true }) providerEventId!: string;
  @Prop({ type: String, required: true }) type!: string;
  @Prop({ type: String, default: 'received', enum: ['received', 'processed', 'failed'] })
  status!: string;
  @Prop({ type: MongooseSchema.Types.ObjectId }) workspaceId?: Types.ObjectId;
  @Prop({ type: Date }) processedAt?: Date;
  @Prop({ type: String }) error?: string;
}
export const BillingWebhookEventSchema = SchemaFactory.createForClass(BillingWebhookEvent);

@Schema({ collection: 'billing_invoices', timestamps: true, versionKey: false })
export class BillingInvoice {
  _id!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: String, required: true, unique: true }) providerInvoiceId!: string;
  @Prop({ type: String, required: true }) status!: string;
  @Prop({ type: Number, required: true }) amountDue!: number;
  @Prop({ type: String, required: true }) currency!: string;
  @Prop({ type: String }) hostedInvoiceUrl?: string;
  @Prop({ type: Date }) dueAt?: Date;
}
export const BillingInvoiceSchema = SchemaFactory.createForClass(BillingInvoice);

@Schema({ collection: 'billing_payment_methods', timestamps: true, versionKey: false })
export class BillingPaymentMethod {
  _id!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: String, required: true, unique: true }) providerPaymentMethodId!: string;
  @Prop({ type: String, required: true }) type!: string;
  @Prop({ type: String }) brand?: string;
  @Prop({ type: String }) last4?: string;
  @Prop({ type: Number }) expiryMonth?: number;
  @Prop({ type: Number }) expiryYear?: number;
  @Prop({ type: Boolean, default: false }) isDefault!: boolean;
}
export const BillingPaymentMethodSchema = SchemaFactory.createForClass(BillingPaymentMethod);

@Schema({ collection: 'billing_coupons', timestamps: true, versionKey: false })
export class BillingCoupon {
  _id!: Types.ObjectId;
  @Prop({ type: String, required: true, unique: true }) code!: string;
  @Prop({ type: Number, min: 0, max: 100 }) percentOff?: number;
  @Prop({ type: Number, min: 0 }) amountOff?: number;
  @Prop({ type: String, default: 'usd' }) currency!: string;
  @Prop({ type: Date }) expiresAt?: Date;
  @Prop({ type: Boolean, default: true }) active!: boolean;
}
export const BillingCouponSchema = SchemaFactory.createForClass(BillingCoupon);

for (const schema of [
  UsageRecordSchema,
  UsageSnapshotSchema,
  BillingInvoiceSchema,
  BillingPaymentMethodSchema,
]) {
  schema.index({ workspaceId: 1, createdAt: -1 });
}
UsageRecordSchema.index({ workspaceId: 1, idempotencyKey: 1 }, { unique: true });
UsageRecordSchema.index({ workspaceId: 1, category: 1, occurredAt: 1 });
UsageSnapshotSchema.index({ workspaceId: 1, periodStart: 1, periodEnd: 1 }, { unique: true });
