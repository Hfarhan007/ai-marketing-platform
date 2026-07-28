export type ContactLifecycle = 'subscriber' | 'lead' | 'customer' | 'evangelist';
export type LeadQualification =
  'unqualified' | 'marketing_qualified' | 'sales_qualified' | 'disqualified' | 'converted';
export type DealState = 'open' | 'won' | 'lost';

const CONTACT_TRANSITIONS: Record<ContactLifecycle, readonly ContactLifecycle[]> = {
  subscriber: ['lead', 'customer'],
  lead: ['subscriber', 'customer'],
  customer: ['evangelist'],
  evangelist: [],
};
const LEAD_TRANSITIONS: Record<LeadQualification, readonly LeadQualification[]> = {
  unqualified: ['marketing_qualified', 'disqualified'],
  marketing_qualified: ['sales_qualified', 'unqualified', 'disqualified'],
  sales_qualified: ['marketing_qualified', 'converted', 'disqualified'],
  disqualified: ['unqualified'],
  converted: [],
};
export class ContactLifecycleMachine {
  assert(current: ContactLifecycle, next: ContactLifecycle) {
    if (current === next) return;
    if (!CONTACT_TRANSITIONS[current]?.includes(next))
      throw new Error(`CONTACT_LIFECYCLE_TRANSITION_FORBIDDEN:${current}:${next}`);
  }
  allowed(current: ContactLifecycle) {
    return CONTACT_TRANSITIONS[current];
  }
}
export class LeadQualificationMachine {
  assert(current: LeadQualification, next: LeadQualification, reason?: string) {
    if (current === next) return;
    if (!LEAD_TRANSITIONS[current]?.includes(next))
      throw new Error(`LEAD_QUALIFICATION_TRANSITION_FORBIDDEN:${current}:${next}`);
    if (next === 'disqualified' && !reason?.trim())
      throw new Error('LEAD_DISQUALIFICATION_REASON_REQUIRED');
  }
  assertConvertible(state: LeadQualification) {
    if (state !== 'sales_qualified') throw new Error('LEAD_NOT_CONVERSION_ELIGIBLE');
  }
  allowed(current: LeadQualification) {
    return LEAD_TRANSITIONS[current] ?? [];
  }
}
export class DealStateMachine {
  assert(current: DealState, next: DealState, allowReopen = false) {
    if (current === next) return;
    if (current === 'open' && (next === 'won' || next === 'lost')) return;
    if ((current === 'won' || current === 'lost') && next === 'open' && allowReopen) return;
    throw new Error(`DEAL_TRANSITION_FORBIDDEN:${current}:${next}`);
  }
}
