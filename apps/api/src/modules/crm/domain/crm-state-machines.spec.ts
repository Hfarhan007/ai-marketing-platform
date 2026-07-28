import { describe, expect, it } from 'vitest';
import {
  ContactLifecycleMachine,
  DealStateMachine,
  LeadQualificationMachine,
  type ContactLifecycle,
  type DealState,
  type LeadQualification,
} from './crm-state-machines.js';
describe('CRM state machines', () => {
  const contacts: ContactLifecycle[] = ['subscriber', 'lead', 'customer', 'evangelist'],
    contactAllowed = new Set([
      'subscriber:subscriber',
      'subscriber:lead',
      'subscriber:customer',
      'lead:lead',
      'lead:subscriber',
      'lead:customer',
      'customer:customer',
      'customer:evangelist',
      'evangelist:evangelist',
    ]);
  for (const from of contacts)
    for (const to of contacts)
      it(`contact ${from} -> ${to} is ${contactAllowed.has(`${from}:${to}`) ? 'allowed' : 'forbidden'}`, () => {
        const action = () => new ContactLifecycleMachine().assert(from, to);
        if (contactAllowed.has(`${from}:${to}`)) expect(action).not.toThrow();
        else expect(action).toThrow();
      });
  const leads: LeadQualification[] = [
      'unqualified',
      'marketing_qualified',
      'sales_qualified',
      'disqualified',
      'converted',
    ],
    leadAllowed = new Set([
      'unqualified:unqualified',
      'unqualified:marketing_qualified',
      'unqualified:disqualified',
      'marketing_qualified:marketing_qualified',
      'marketing_qualified:sales_qualified',
      'marketing_qualified:unqualified',
      'marketing_qualified:disqualified',
      'sales_qualified:sales_qualified',
      'sales_qualified:marketing_qualified',
      'sales_qualified:converted',
      'sales_qualified:disqualified',
      'disqualified:disqualified',
      'disqualified:unqualified',
      'converted:converted',
    ]);
  for (const from of leads)
    for (const to of leads)
      it(`lead ${from} -> ${to} is ${leadAllowed.has(`${from}:${to}`) ? 'allowed' : 'forbidden'}`, () => {
        const action = () => new LeadQualificationMachine().assert(from, to, 'reason');
        if (leadAllowed.has(`${from}:${to}`)) expect(action).not.toThrow();
        else expect(action).toThrow();
      });
  it('requires a disqualification reason', () =>
    expect(() => new LeadQualificationMachine().assert('unqualified', 'disqualified')).toThrow(
      'LEAD_DISQUALIFICATION_REASON_REQUIRED',
    ));
  const deals: DealState[] = ['open', 'won', 'lost'],
    dealAllowed = new Set(['open:open', 'open:won', 'open:lost', 'won:won', 'lost:lost']);
  for (const from of deals)
    for (const to of deals)
      it(`deal ${from} -> ${to} is ${dealAllowed.has(`${from}:${to}`) ? 'allowed' : 'forbidden'}`, () => {
        const action = () => new DealStateMachine().assert(from, to);
        if (dealAllowed.has(`${from}:${to}`)) expect(action).not.toThrow();
        else expect(action).toThrow();
      });
  it('allows an explicitly authorized reopening', () => {
    expect(() => new DealStateMachine().assert('won', 'open', true)).not.toThrow();
    expect(() => new DealStateMachine().assert('lost', 'open', true)).not.toThrow();
  });
});
