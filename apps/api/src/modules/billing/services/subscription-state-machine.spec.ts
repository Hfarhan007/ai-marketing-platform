import { ConflictException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { SubscriptionStateMachine } from './subscription-state-machine.js';
describe('SubscriptionStateMachine', () => {
  const machine = new SubscriptionStateMachine();
  it('handles trial expiration', () =>
    expect(machine.transition('trialing', 'trial_expired')).toBe('active'));
  it('moves failed active payments through past due and grace', () => {
    expect(machine.transition('active', 'payment_failed')).toBe('past_due');
    expect(machine.transition('past_due', 'payment_failed')).toBe('grace_period');
  });
  it('recovers during grace and expires after grace', () => {
    expect(machine.transition('grace_period', 'payment_succeeded')).toBe('active');
    expect(machine.transition('grace_period', 'grace_expired')).toBe('expired');
  });
  it('handles cancellation', () =>
    expect(machine.transition('active', 'cancel')).toBe('cancelled'));
  it('rejects invalid transitions', () =>
    expect(() => machine.transition('expired', 'payment_succeeded')).toThrow(ConflictException));
});
