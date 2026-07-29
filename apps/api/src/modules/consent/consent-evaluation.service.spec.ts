import { Types } from 'mongoose';
import { describe, expect, it, vi } from 'vitest';
import { ConsentEvaluationService } from './consent-evaluation.service.js';

const id = () => new Types.ObjectId();
const policy = (rules: Array<Record<string, unknown>>) => ({
  _id: id(),
  purposeRules: rules,
});

const repository = () => ({
  activePolicy: vi.fn(),
  latestReceipt: vi.fn(),
  latestWithdrawal: vi.fn(),
  legalBasis: vi.fn(),
  audit: vi.fn().mockResolvedValue(undefined),
});

describe('ConsentEvaluationService', () => {
  it('denies when the latest conflicting record is an explicit denial', async () => {
    const repo = repository();
    repo.activePolicy.mockResolvedValue(
      policy([
        {
          purpose: 'marketing_email',
          consentRequired: true,
          allowedLegalBases: [],
        },
      ]),
    );
    repo.latestReceipt.mockResolvedValue({
      _id: id(),
      decision: 'denied',
      recordedAt: new Date('2026-01-02T00:00:00Z'),
    });
    repo.latestWithdrawal.mockResolvedValue(null);

    const result = await new ConsentEvaluationService(repo as never).evaluate({
      workspaceId: String(id()),
      subjectId: String(id()),
      purpose: 'marketing_email',
    });

    expect(result).toMatchObject({ allowed: false, reason: 'denied' });
  });

  it('applies a withdrawal immediately, including at the same timestamp as a grant', async () => {
    const repo = repository();
    const occurredAt = new Date('2026-01-02T00:00:00Z');
    repo.activePolicy.mockResolvedValue(
      policy([
        {
          purpose: 'ai_memory',
          consentRequired: true,
          allowedLegalBases: [],
        },
      ]),
    );
    repo.latestReceipt.mockResolvedValue({
      _id: id(),
      decision: 'granted',
      recordedAt: occurredAt,
      guardian: null,
    });
    repo.latestWithdrawal.mockResolvedValue({
      _id: id(),
      withdrawnAt: occurredAt,
    });

    const result = await new ConsentEvaluationService(repo as never).evaluate({
      workspaceId: String(id()),
      subjectId: String(id()),
      purpose: 'ai_memory',
    });

    expect(result).toMatchObject({ allowed: false, reason: 'withdrawn' });
  });

  it('enforces each purpose independently and permits a configured legal basis', async () => {
    const repo = repository();
    repo.activePolicy.mockResolvedValue(
      policy([
        {
          purpose: 'transactional_email',
          consentRequired: false,
          allowedLegalBases: ['contract'],
        },
        {
          purpose: 'marketing_email',
          consentRequired: true,
          allowedLegalBases: [],
        },
      ]),
    );
    repo.latestReceipt.mockResolvedValue(null);
    repo.latestWithdrawal.mockResolvedValue(null);
    repo.legalBasis.mockResolvedValue({ _id: id(), code: 'contract' });
    const service = new ConsentEvaluationService(repo as never);
    const request = { workspaceId: String(id()), subjectId: String(id()) };

    const transactional = await service.evaluate({
      ...request,
      purpose: 'transactional_email',
    });
    const marketing = await service.evaluate({ ...request, purpose: 'marketing_email' });

    expect(transactional).toMatchObject({ allowed: true, reason: 'legal_basis' });
    expect(marketing).toMatchObject({ allowed: false, reason: 'no_valid_basis' });
  });
});
