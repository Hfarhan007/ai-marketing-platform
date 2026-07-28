import { describe, expect, it } from 'vitest';
import { CompanyPolicy } from './company-policy.js';
import { ContactIdentityPolicy, preserveConsent } from './contact-policy.js';
import { DealPolicy } from './deal-policy.js';
import { PipelinePolicy } from './pipeline-policy.js';
describe('CRM invariant policies', () => {
  it('normalizes identities, selects one primary, and rejects duplicates', () => {
    const policy = new ContactIdentityPolicy(),
      points = policy.prepare([{ value: ' Person@Example.COM ' }], 'email');
    expect(points[0]).toMatchObject({ normalized: 'person@example.com', primary: true });
    expect(() =>
      policy.prepare([{ value: 'a@example.com' }, { value: 'A@example.com' }], 'email'),
    ).toThrow('DUPLICATE_CONTACT_IDENTITY');
    expect(() =>
      policy.prepare(
        [
          { value: '+12025550100', primary: true },
          { value: '+12025550101', primary: true },
        ],
        'phone',
      ),
    ).toThrow('EXACTLY_ONE_PRIMARY_IDENTITY_REQUIRED');
  });
  it('merges identities deterministically and preserves restrictive consent', () => {
    const policy = new ContactIdentityPolicy(),
      merged = policy.merge(
        [{ value: 'target@example.com', primary: true }],
        [{ value: 'TARGET@example.com' }, { value: 'source@example.com', primary: true }],
        'email',
      );
    expect(merged).toHaveLength(2);
    expect(merged.find((value) => value.primary)?.normalized).toBe('target@example.com');
    expect(preserveConsent({ email: true, sms: true }, { email: false, phone: true })).toEqual({
      email: false,
      phone: true,
      sms: true,
    });
  });
  it('normalizes company domains and prevents relationship cycles', () => {
    const policy = new CompanyPolicy();
    expect(policy.normalizeDomain('HTTPS://www.Example.COM/path')).toBe('example.com');
    expect(() => policy.assertParent('a', 'a')).toThrow('COMPANY_RELATIONSHIP_CYCLE');
    expect(() => policy.assertMutable(true, 'update')).toThrow('ARCHIVED_COMPANY_IS_IMMUTABLE');
  });
  it('enforces deal values, discounts, and forecasts', () => {
    const policy = new DealPolicy();
    expect(policy.assertLineItems([{ quantity: 2, unitPrice: 50, discountPercent: 10 }], 90)).toBe(
      90,
    );
    expect(() =>
      policy.assertLineItems([{ quantity: 1, unitPrice: 100, discountPercent: 25 }], 75),
    ).toThrow('DEAL_DISCOUNT_APPROVAL_REQUIRED');
    expect(policy.forecast(80)).toBe('commit');
    expect(policy.probabilityFor('won', 10)).toBe(100);
  });
  it('protects used stages and validates stage-entry rules', () => {
    const policy = new PipelinePolicy(),
      current = [{ id: 'a', name: 'New', order: 0, probability: 10 }],
      next = [{ id: 'b', name: 'Qualified', order: 1, probability: 50 }];
    expect(() => policy.assertSafeChange(current, next, new Set(['a']))).toThrow(
      'USED_PIPELINE_STAGE_REQUIRES_MIGRATION',
    );
    expect(() =>
      policy.assertSafeChange(current, next, new Set(['a']), new Map([['a', 'b']])),
    ).not.toThrow();
    expect(() =>
      policy.assertEntry(
        {
          id: 'b',
          name: 'Qualified',
          order: 1,
          probability: 50,
          rules: { minimumValue: 100, requiresOwner: true },
        },
        { value: 50 },
      ),
    ).toThrow('PIPELINE_STAGE_MINIMUM_VALUE_NOT_MET');
  });
});
