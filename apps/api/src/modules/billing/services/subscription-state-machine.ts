import { ConflictException, Injectable } from '@nestjs/common';
import type { SubscriptionStatus } from '../schemas/billing.schemas.js';

export type BillingEvent =
  | 'trial_expired'
  | 'payment_succeeded'
  | 'payment_failed'
  | 'grace_expired'
  | 'cancel'
  | 'period_ended';
const TRANSITIONS: Record<SubscriptionStatus, Partial<Record<BillingEvent, SubscriptionStatus>>> = {
  trialing: {
    trial_expired: 'active',
    payment_succeeded: 'active',
    payment_failed: 'grace_period',
    cancel: 'cancelled',
  },
  active: { payment_succeeded: 'active', payment_failed: 'past_due', cancel: 'cancelled' },
  past_due: { payment_succeeded: 'active', payment_failed: 'grace_period', cancel: 'cancelled' },
  grace_period: { payment_succeeded: 'active', grace_expired: 'expired', cancel: 'cancelled' },
  cancelled: { period_ended: 'expired' },
  expired: {},
};
@Injectable()
export class SubscriptionStateMachine {
  transition(current: SubscriptionStatus, event: BillingEvent): SubscriptionStatus {
    const next = TRANSITIONS[current][event];
    if (!next)
      throw new ConflictException(`Invalid subscription transition: ${current} -> ${event}`);
    return next;
  }
}
