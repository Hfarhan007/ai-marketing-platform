import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { PromptVersion } from './prompt-version.schema.js';
import { PromptRepository } from './repositories/prompt.repository.js';
@Injectable()
export class PromptRegistryService {
  constructor(private readonly prompts: PromptRepository) {}
  async resolve(workspaceId: string, key: string, options: { feature?: string; environment?: string; variables?: Record<string, string | number | boolean> } = {}) {
    return this.resolveInternal(workspaceId, key, options, new Set());
  }
  private async resolveInternal(workspaceId: string, key: string, options: { feature?: string; environment?: string; variables?: Record<string, string | number | boolean> }, stack: Set<string>) {
    if (stack.has(key) || stack.size >= 5) throw new BadRequestException('Prompt composition cycle or depth limit exceeded');
    stack.add(key);
    const template = await this.prompts.template(workspaceId, key);
    if (!template) throw new NotFoundException('Prompt definition not found');
    const assignment = options.feature ? await this.prompts.assignment(workspaceId, template._id, options.feature, options.environment ?? 'production') : null;
    const versionNumber = assignment ? this.assignedVersion(workspaceId, key, assignment) : template.activeVersion;
    const version = await this.prompts.versionNumber(template, versionNumber);
    if (!version || (version.status && !['approved', 'active'].includes(version.status))) throw new NotFoundException('Active prompt version not found');
    let content = this.render(version, options.variables ?? {});
    for (const componentKey of version.composedPrompts ?? []) {
      const component = await this.resolveInternal(workspaceId, componentKey, options, new Set(stack));
      content = content.replaceAll(`{{>${componentKey}}}`, component.content);
    }
    if (/\{\{>?[A-Za-z0-9_.-]+\}\}/u.test(content)) throw new BadRequestException('Prompt contains unresolved variables or components');
    return { content, version: version.version, versionId: String(version._id), hash: version.contentHash, outputSchema: version.outputSchema, key };
  }
  private assignedVersion(workspaceId: string, key: string, assignment: { stableVersion: number; canaryVersion: number | null; rolloutPercentage: number; canaryWorkspaceIds: string[] }) {
    if (!assignment.canaryVersion) return assignment.stableVersion;
    if (assignment.canaryWorkspaceIds.includes(workspaceId)) return assignment.canaryVersion;
    const bucket = Number.parseInt(createHash('sha256').update(`${workspaceId}:${key}`).digest('hex').slice(0, 8), 16) % 100;
    return bucket < assignment.rolloutPercentage ? assignment.canaryVersion : assignment.stableVersion;
  }
  private render(version: PromptVersion, values: Record<string, string | number | boolean>) {
    const variables = version.variables ?? [], definitions = new Map(variables.map((variable) => [variable.name, variable]));
    for (const key of Object.keys(values)) {
      if (!definitions.has(key)) throw new BadRequestException(`Unknown prompt variable: ${key}`);
      if (/(?:secret|token|password|api[_-]?key)/iu.test(key)) throw new BadRequestException('Secret interpolation is prohibited');
      if (typeof values[key] === 'string' && /\b(?:sk|key|token)[-_][A-Za-z0-9_-]{12,}\b/iu.test(String(values[key]))) throw new BadRequestException('Secret interpolation is prohibited');
    }
    for (const variable of variables) {
      const value = values[variable.name];
      if (variable.required && (value === undefined || value === '')) throw new BadRequestException(`Missing prompt variable: ${variable.name}`);
      if (value !== undefined && typeof value !== variable.type) throw new BadRequestException(`Invalid prompt variable type: ${variable.name}`);
      if (typeof value === 'string' && variable.maxLength && value.length > variable.maxLength) throw new BadRequestException(`Prompt variable too long: ${variable.name}`);
    }
    return version.content.replace(/\{\{([A-Za-z0-9_]+)\}\}/gu, (_match, name: string) => values[name] === undefined ? `{{${name}}}` : String(values[name]));
  }
}
