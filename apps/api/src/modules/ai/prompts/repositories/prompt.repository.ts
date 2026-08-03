import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import { PromptTemplate } from '../prompt-template.schema.js';
import { PromptVersion } from '../prompt-version.schema.js';
import { PromptApprovalAudit, PromptAssignment } from '../prompt-lifecycle.schemas.js';

@Injectable()
export class PromptRepository {
  constructor(
    @InjectModel(PromptTemplate.name) private readonly templates: Model<PromptTemplate>,
    @InjectModel(PromptVersion.name) private readonly versions: Model<PromptVersion>,
    @InjectModel(PromptAssignment.name) private readonly assignments: Model<PromptAssignment>,
    @InjectModel(PromptApprovalAudit.name) private readonly audits: Model<PromptApprovalAudit>,
  ) {}
  template(workspaceId: string, key: string) {
    return this.templates
      .findOne({ workspaceId: new Types.ObjectId(workspaceId), key, enabled: true })
      .lean<PromptTemplate>()
      .exec();
  }
  templateById(workspaceId: string, templateId: string) {
    return this.templates.findOne({ workspaceId: new Types.ObjectId(workspaceId), _id: new Types.ObjectId(templateId), enabled: true }).lean<PromptTemplate>().exec();
  }
  async createTemplate(input: { workspaceId: string; userId: string; key: string; name: string; description: string }) {
    const template = await new this.templates({ workspaceId: new Types.ObjectId(input.workspaceId), createdBy: new Types.ObjectId(input.userId), key: input.key, name: input.name, description: input.description, activeVersion: 0, enabled: true }).save();
    return template.toObject();
  }
  version(template: PromptTemplate) {
    return this.versions
      .findOne({
        workspaceId: template.workspaceId,
        templateId: template._id,
        version: template.activeVersion,
      })
      .select('+content')
      .lean<PromptVersion>()
      .exec();
  }
  versionNumber(template: PromptTemplate, version: number) {
    return this.versions.findOne({ workspaceId: template.workspaceId, templateId: template._id, version }).select('+content').lean<PromptVersion>().exec();
  }
  assignment(workspaceId: string, templateId: Types.ObjectId, feature: string, environment: string) {
    return this.assignments.findOne({ workspaceId: new Types.ObjectId(workspaceId), templateId, feature, environment }).lean<PromptAssignment>().exec();
  }
  async createVersion(input: Omit<PromptVersion, '_id'>) {
    const latest = await this.versions.findOne({ workspaceId: input.workspaceId, templateId: input.templateId }).sort({ version: -1 }).lean<PromptVersion>().exec();
    return new this.versions({ ...input, version: (latest?.version ?? 0) + 1 }).save();
  }
  transition(workspaceId: string, templateId: string, version: number, from: string[], update: Record<string, unknown>) {
    return this.versions.findOneAndUpdate({ workspaceId: new Types.ObjectId(workspaceId), templateId: new Types.ObjectId(templateId), version, status: { $in: from } }, { $set: update }, { new: true }).lean<PromptVersion>().exec();
  }
  audit(value: Record<string, unknown>) { return new this.audits(value).save(); }
  assign(input: { workspaceId: string; templateId: string; feature: string; environment: string; stableVersion: number; canaryVersion: number | null; rolloutPercentage: number; canaryWorkspaceIds: string[]; rollbackVersion: number | null }) {
    return this.assignments.findOneAndUpdate({ workspaceId: new Types.ObjectId(input.workspaceId), templateId: new Types.ObjectId(input.templateId), feature: input.feature, environment: input.environment }, { $set: { stableVersion: input.stableVersion, canaryVersion: input.canaryVersion, rolloutPercentage: input.rolloutPercentage, canaryWorkspaceIds: input.canaryWorkspaceIds, rollbackVersion: input.rollbackVersion } }, { upsert: true, new: true }).lean<PromptAssignment>().exec();
  }
  activateTemplate(workspaceId: string, templateId: string, version: number) {
    return this.templates.updateOne({ _id: new Types.ObjectId(templateId), workspaceId: new Types.ObjectId(workspaceId) }, { $set: { activeVersion: version } });
  }
  evaluations(workspaceId: string, versions: string[]) {
    return this.versions.db.collection('ai_evaluation_runs').find({ workspaceId: new Types.ObjectId(workspaceId), promptVersion: { $in: versions } }).sort({ createdAt: -1 }).toArray();
  }
}
