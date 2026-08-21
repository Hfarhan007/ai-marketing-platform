import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import type { LeadQualificationOutput } from '../lead-qualification.contract.js';
import { LeadQualificationResult } from '../schemas/lead-qualification-result.schema.js';

@Injectable()
export class LeadQualificationRepository {
  constructor(@InjectModel(LeadQualificationResult.name) private readonly model: Model<LeadQualificationResult>) {}
  save(input: { workspaceId: string; userId: string; leadId?: string; requestId: string; promptVersion: string; provider: string; model: string; result: LeadQualificationOutput; inputTokens: number; outputTokens: number; costUsd: number }) {
    return new this.model({ ...input, workspaceId: new Types.ObjectId(input.workspaceId), createdBy: new Types.ObjectId(input.userId), leadId: input.leadId ? new Types.ObjectId(input.leadId) : null, inputPiiRedacted: true }).save();
  }
}
