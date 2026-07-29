import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { ConsentRepository } from './repositories/consent.repository.js';
import type { ConsentEvaluation, ConsentEvaluationRequest } from './consent.types.js';

@Injectable()
export class ConsentEvaluationService {
  constructor(private readonly repository: ConsentRepository) {}

  async evaluate(request: ConsentEvaluationRequest): Promise<ConsentEvaluation> {
    const at = request.at ?? new Date();
    const region = request.region?.trim().toUpperCase() || 'GLOBAL';
    const policy = await this.repository.activePolicy(request.workspaceId, region, at);
    if (!policy)
      return this.finish(request, {
        allowed: false,
        purpose: request.purpose,
        reason: 'no_policy',
        evaluatedAt: at,
      });
    const rule = policy.purposeRules.find((candidate) => candidate.purpose === request.purpose);
    if (!rule)
      return this.finish(request, {
        allowed: false,
        purpose: request.purpose,
        reason: 'no_valid_basis',
        policyVersionId: String(policy._id),
        evaluatedAt: at,
      });

    const [receipt, withdrawal] = await Promise.all([
      this.repository.latestReceipt(request.workspaceId, request.subjectId, request.purpose, at),
      this.repository.latestWithdrawal(request.workspaceId, request.subjectId, request.purpose, at),
    ]);
    if (
      withdrawal &&
      (!receipt || withdrawal.withdrawnAt.valueOf() >= receipt.recordedAt.valueOf())
    )
      return this.finish(request, {
        allowed: false,
        purpose: request.purpose,
        reason: 'withdrawn',
        policyVersionId: String(policy._id),
        ...(receipt ? { receiptId: String(receipt._id) } : {}),
        evaluatedAt: at,
      });
    if (receipt?.decision === 'denied')
      return this.finish(request, {
        allowed: false,
        purpose: request.purpose,
        reason: 'denied',
        policyVersionId: String(policy._id),
        receiptId: String(receipt._id),
        evaluatedAt: at,
      });
    if (receipt?.decision === 'granted') {
      if (rule.guardianConsentRequired && !receipt.guardian?.verifiedAt)
        return this.finish(request, {
          allowed: false,
          purpose: request.purpose,
          reason: 'guardian_required',
          policyVersionId: String(policy._id),
          receiptId: String(receipt._id),
          evaluatedAt: at,
        });
      return this.finish(request, {
        allowed: true,
        purpose: request.purpose,
        reason: 'consent_granted',
        policyVersionId: String(policy._id),
        receiptId: String(receipt._id),
        evaluatedAt: at,
      });
    }
    if (!rule.consentRequired) {
      const basis = await this.repository.legalBasis(
        request.workspaceId,
        request.purpose,
        region,
        rule.allowedLegalBases,
        at,
      );
      if (basis)
        return this.finish(request, {
          allowed: true,
          purpose: request.purpose,
          reason: 'legal_basis',
          policyVersionId: String(policy._id),
          legalBasisId: String(basis._id),
          evaluatedAt: at,
        });
    }
    return this.finish(request, {
      allowed: false,
      purpose: request.purpose,
      reason: 'no_valid_basis',
      policyVersionId: String(policy._id),
      evaluatedAt: at,
    });
  }

  async restrictedExportFields(
    workspaceId: string,
    subjectId: string,
    region = 'GLOBAL',
  ): Promise<Set<string>> {
    const policy = await this.repository.activePolicy(workspaceId, region, new Date());
    if (!policy) return new Set(['consentSummary', 'customFields', 'communicationPreferences']);
    const restricted = policy.purposeRules.flatMap((rule) => rule.restrictedExportFields ?? []);
    const sharing = await this.evaluate({
      workspaceId,
      subjectId,
      purpose: 'third_party_sharing',
      region,
    });
    if (!sharing.allowed)
      restricted.push('customFields', 'communicationPreferences', 'consentSummary');
    return new Set(restricted);
  }

  private async finish(
    request: ConsentEvaluationRequest,
    result: ConsentEvaluation,
  ): Promise<ConsentEvaluation> {
    await this.repository.audit({
      workspaceId: new Types.ObjectId(request.workspaceId),
      subjectId: new Types.ObjectId(request.subjectId),
      action: 'evaluated',
      purpose: request.purpose,
      allowed: result.allowed,
      reason: result.reason,
      policyVersionId: result.policyVersionId ? new Types.ObjectId(result.policyVersionId) : null,
      metadata: { receiptId: result.receiptId, legalBasisId: result.legalBasisId },
    });
    return result;
  }
}
