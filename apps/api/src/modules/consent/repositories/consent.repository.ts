import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import {
  ConsentAuditEvent,
  ConsentLegalBasis,
  ConsentPolicy,
  ConsentPolicyVersion,
  ConsentReceipt,
  ConsentSourceEvidence,
  ConsentWithdrawal,
} from '../schemas/consent.schemas.js';
import type { ConsentPurpose } from '../consent.types.js';

const oid = (value: string) => new Types.ObjectId(value);

@Injectable()
export class ConsentRepository {
  constructor(
    @InjectModel(ConsentPolicy.name) private readonly policies: Model<ConsentPolicy>,
    @InjectModel(ConsentPolicyVersion.name) private readonly versions: Model<ConsentPolicyVersion>,
    @InjectModel(ConsentLegalBasis.name) private readonly bases: Model<ConsentLegalBasis>,
    @InjectModel(ConsentReceipt.name) private readonly receipts: Model<ConsentReceipt>,
    @InjectModel(ConsentWithdrawal.name) private readonly withdrawals: Model<ConsentWithdrawal>,
    @InjectModel(ConsentSourceEvidence.name)
    private readonly evidence: Model<ConsentSourceEvidence>,
    @InjectModel(ConsentAuditEvent.name) private readonly audits: Model<ConsentAuditEvent>,
  ) {}

  async activePolicy(workspaceId: string, region: string, at: Date) {
    const filter = { workspaceId: oid(workspaceId) };
    const policy =
      (await this.policies
        .findOne({ ...filter, region })
        .lean<ConsentPolicy>()
        .exec()) ??
      (region === 'GLOBAL'
        ? null
        : await this.policies
            .findOne({ ...filter, region: 'GLOBAL' })
            .lean<ConsentPolicy>()
            .exec());
    if (!policy) return null;
    return this.versions
      .findOne({
        _id: policy.activeVersionId,
        workspaceId: oid(workspaceId),
        effectiveFrom: { $lte: at },
        $or: [{ effectiveUntil: null }, { effectiveUntil: { $gt: at } }],
      })
      .lean<ConsentPolicyVersion>()
      .exec();
  }

  latestReceipt(workspaceId: string, subjectId: string, purpose: ConsentPurpose, at: Date) {
    return this.receipts
      .findOne({
        workspaceId: oid(workspaceId),
        subjectId: oid(subjectId),
        purpose,
        recordedAt: { $lte: at },
        $or: [{ expiresAt: null }, { expiresAt: { $gt: at } }],
      })
      .sort({ recordedAt: -1, decision: 1, _id: -1 })
      .lean<ConsentReceipt>()
      .exec();
  }

  latestWithdrawal(workspaceId: string, subjectId: string, purpose: ConsentPurpose, at: Date) {
    return this.withdrawals
      .findOne({
        workspaceId: oid(workspaceId),
        subjectId: oid(subjectId),
        purpose,
        withdrawnAt: { $lte: at },
      })
      .sort({ withdrawnAt: -1, _id: -1 })
      .lean<ConsentWithdrawal>()
      .exec();
  }

  async legalBasis(
    workspaceId: string,
    purpose: ConsentPurpose,
    region: string,
    codes: string[],
    at: Date,
  ) {
    const filter = {
      workspaceId: oid(workspaceId),
      purpose,
      code: { $in: codes },
      active: true,
      effectiveFrom: { $lte: at },
      $or: [{ effectiveUntil: null }, { effectiveUntil: { $gt: at } }],
    };
    const regional = await this.bases
      .findOne({ ...filter, region })
      .lean<ConsentLegalBasis>()
      .exec();
    if (regional || region === 'GLOBAL') return regional;
    return this.bases
      .findOne({ ...filter, region: 'GLOBAL' })
      .lean<ConsentLegalBasis>()
      .exec();
  }

  createEvidence(input: object) {
    return new this.evidence(input).save();
  }
  createReceipt(input: object) {
    return new this.receipts(input).save();
  }
  createWithdrawal(input: object) {
    return new this.withdrawals(input).save();
  }
  audit(input: object) {
    return new this.audits(input).save();
  }
}
