import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Types } from 'mongoose';
import { ConsentRepository } from './repositories/consent.repository.js';
import type { ConsentDecision, ConsentPurpose } from './consent.types.js';

interface EvidenceInput {
  sourceType: string;
  sourceReference: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class ConsentService {
  constructor(private readonly repository: ConsentRepository) {}

  async record(input: {
    workspaceId: string;
    subjectId: string;
    purpose: ConsentPurpose;
    decision: ConsentDecision;
    policyVersionId: string;
    evidence: EvidenceInput;
    legalBasisId?: string;
    expiresAt?: Date;
    guardian?: { subjectId?: string; name?: string; relationship?: string; verifiedAt?: Date };
  }) {
    const capturedAt = new Date();
    const evidence = await this.repository.createEvidence({
      workspaceId: new Types.ObjectId(input.workspaceId),
      subjectId: new Types.ObjectId(input.subjectId),
      ...input.evidence,
      evidenceHash: createHash('sha256').update(JSON.stringify(input.evidence)).digest('hex'),
      capturedAt,
    });
    const receipt = await this.repository.createReceipt({
      workspaceId: new Types.ObjectId(input.workspaceId),
      subjectId: new Types.ObjectId(input.subjectId),
      purpose: input.purpose,
      decision: input.decision,
      policyVersionId: new Types.ObjectId(input.policyVersionId),
      evidenceId: evidence._id,
      legalBasisId: input.legalBasisId ? new Types.ObjectId(input.legalBasisId) : null,
      recordedAt: capturedAt,
      expiresAt: input.expiresAt ?? null,
      guardian: input.guardian ?? null,
    });
    await this.repository.audit({
      workspaceId: new Types.ObjectId(input.workspaceId),
      subjectId: new Types.ObjectId(input.subjectId),
      action: 'receipt_recorded',
      purpose: input.purpose,
      allowed: input.decision === 'granted',
      reason: input.decision,
      policyVersionId: new Types.ObjectId(input.policyVersionId),
      metadata: { receiptId: String(receipt._id), evidenceId: String(evidence._id) },
    });
    return receipt;
  }

  async withdraw(input: {
    workspaceId: string;
    subjectId: string;
    purpose: ConsentPurpose;
    policyVersionId: string;
    receiptId?: string;
    reason?: string;
    evidence: EvidenceInput;
  }) {
    if (!input.evidence.sourceReference)
      throw new BadRequestException('Withdrawal evidence is required');
    const withdrawnAt = new Date();
    const evidence = await this.repository.createEvidence({
      workspaceId: new Types.ObjectId(input.workspaceId),
      subjectId: new Types.ObjectId(input.subjectId),
      ...input.evidence,
      evidenceHash: createHash('sha256').update(JSON.stringify(input.evidence)).digest('hex'),
      capturedAt: withdrawnAt,
    });
    const withdrawal = await this.repository.createWithdrawal({
      workspaceId: new Types.ObjectId(input.workspaceId),
      subjectId: new Types.ObjectId(input.subjectId),
      purpose: input.purpose,
      receiptId: input.receiptId ? new Types.ObjectId(input.receiptId) : null,
      policyVersionId: new Types.ObjectId(input.policyVersionId),
      evidenceId: evidence._id,
      withdrawnAt,
      reason: input.reason ?? null,
    });
    await this.repository.audit({
      workspaceId: new Types.ObjectId(input.workspaceId),
      subjectId: new Types.ObjectId(input.subjectId),
      action: 'withdrawn',
      purpose: input.purpose,
      allowed: false,
      reason: input.reason ?? 'subject_withdrawal',
      policyVersionId: new Types.ObjectId(input.policyVersionId),
      metadata: { withdrawalId: String(withdrawal._id), evidenceId: String(evidence._id) },
    });
    return withdrawal;
  }
}
