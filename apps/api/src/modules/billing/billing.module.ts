import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BillingController } from './controllers/billing.controller.js';
import {
  BillingProviderRegistry,
  FakeBillingProvider,
  StripeBillingProvider,
} from './providers/billing.providers.js';
import { BillingRepository } from './repositories/billing.repository.js';
import {
  BillingCoupon,
  BillingCouponSchema,
  BillingCustomer,
  BillingCustomerSchema,
  BillingInvoice,
  BillingInvoiceSchema,
  BillingPaymentMethod,
  BillingPaymentMethodSchema,
  BillingPlan,
  BillingPlanSchema,
  BillingWebhookEvent,
  BillingWebhookEventSchema,
  Subscription,
  SubscriptionSchema,
  UsageRecord,
  UsageRecordSchema,
  UsageSnapshot,
  UsageSnapshotSchema,
} from './schemas/billing.schemas.js';
import { BillingService } from './services/billing.service.js';
import { BillingWebhookService } from './services/billing-webhook.service.js';
import { SubscriptionStateMachine } from './services/subscription-state-machine.js';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BillingPlan.name, schema: BillingPlanSchema },
      { name: BillingCustomer.name, schema: BillingCustomerSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: UsageRecord.name, schema: UsageRecordSchema },
      { name: UsageSnapshot.name, schema: UsageSnapshotSchema },
      { name: BillingWebhookEvent.name, schema: BillingWebhookEventSchema },
      { name: BillingInvoice.name, schema: BillingInvoiceSchema },
      { name: BillingPaymentMethod.name, schema: BillingPaymentMethodSchema },
      { name: BillingCoupon.name, schema: BillingCouponSchema },
    ]),
  ],
  controllers: [BillingController],
  providers: [
    BillingRepository,
    FakeBillingProvider,
    StripeBillingProvider,
    BillingProviderRegistry,
    SubscriptionStateMachine,
    BillingService,
    BillingWebhookService,
  ],
  exports: [BillingService],
})
export class BillingModule {}
