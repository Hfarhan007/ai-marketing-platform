import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import { PromptTemplate } from '../prompt-template.schema.js';
import { PromptVersion } from '../prompt-version.schema.js';

@Injectable()
export class PromptRepository {
  constructor(
    @InjectModel(PromptTemplate.name) private readonly templates: Model<PromptTemplate>,
    @InjectModel(PromptVersion.name) private readonly versions: Model<PromptVersion>,
  ) {}
  template(workspaceId: string, key: string) {
    return this.templates
      .findOne({ workspaceId: new Types.ObjectId(workspaceId), key, enabled: true })
      .lean<PromptTemplate>()
      .exec();
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
}
