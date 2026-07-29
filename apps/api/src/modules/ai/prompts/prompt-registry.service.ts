import { Injectable, NotFoundException } from '@nestjs/common';
import { PromptRepository } from './repositories/prompt.repository.js';
@Injectable()
export class PromptRegistryService {
  constructor(private readonly prompts: PromptRepository) {}
  async resolve(workspaceId: string, key: string) {
    const t = await this.prompts.template(workspaceId, key);
    if (!t) throw new NotFoundException('Prompt template not found');
    const v = await this.prompts.version(t);
    if (!v) throw new NotFoundException('Prompt version not found');
    return { content: v.content, version: v.version, hash: v.contentHash };
  }
}
