import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Types } from 'mongoose';
import type { Permission } from '../../permissions/constants/permission.catalog.js';
import { PromptRepository } from './repositories/prompt.repository.js';
@Injectable()
export class PromptLifecycleService {
  constructor(private readonly repository: PromptRepository) {}
  createDefinition(input: { workspaceId: string; userId: string; key: string; name: string; description?: string }) {
    if (!/^[a-z][a-z0-9_.-]{2,99}$/u.test(input.key)) throw new ConflictException('Invalid prompt definition key');
    return this.repository.createTemplate({ ...input, description: input.description ?? '' });
  }
  createVersion(input: { workspaceId: string; templateId: string; userId: string; content: string; variables?: Array<{ name: string; type: 'string' | 'number' | 'boolean'; required: boolean; maxLength?: number }>; outputSchema?: Record<string, unknown>; composedPrompts?: string[]; features?: string[]; environments?: string[]; changelog: string }) {
    if (!input.changelog.trim()) throw new ConflictException('Prompt changelog is required');
    return this.repository.createVersion({ workspaceId: new Types.ObjectId(input.workspaceId), templateId: new Types.ObjectId(input.templateId), version: 0, content: input.content, contentHash: createHash('sha256').update(JSON.stringify({ content: input.content, variables: input.variables ?? [], outputSchema: input.outputSchema ?? null, composition: input.composedPrompts ?? [] })).digest('hex'), createdBy: new Types.ObjectId(input.userId), variables: input.variables ?? [], outputSchema: input.outputSchema ?? null, composedPrompts: input.composedPrompts ?? [], features: input.features ?? [], environments: input.environments ?? ['development'], status: 'draft', evaluationStatus: 'pending', changelog: input.changelog, approvedBy: null, approvedAt: null });
  }
  async transition(input: { workspaceId: string; templateId: string; version: number; userId: string; action: 'submit_review' | 'approve' | 'retire'; reason: string }) {
    const transitions = { submit_review: { from: ['draft'], to: 'review' }, approve: { from: ['review'], to: 'approved' }, retire: { from: ['approved', 'active'], to: 'retired' } } as const;
    const rule = transitions[input.action], update: Record<string, unknown> = { status: rule.to };
    if (input.action === 'approve') Object.assign(update, { approvedBy: new Types.ObjectId(input.userId), approvedAt: new Date() });
    const version = await this.repository.transition(input.workspaceId, input.templateId, input.version, [...rule.from], update);
    if (!version) throw new ConflictException('Prompt lifecycle transition is not allowed');
    await this.repository.audit({ workspaceId: new Types.ObjectId(input.workspaceId), templateId: new Types.ObjectId(input.templateId), version: input.version, action: input.action, actorId: new Types.ObjectId(input.userId), reason: input.reason, fromStatus: rule.from.join('|'), toStatus: rule.to });
    return version;
  }
  async activate(input: { workspaceId: string; templateId: string; version: number; feature: string; environment: 'development' | 'staging' | 'production'; rolloutPercentage: number; canaryWorkspaceIds?: string[]; userId: string; permissions: Permission[]; reason: string }) {
    if (input.environment === 'production' && !input.permissions.includes('agents.manage')) throw new ForbiddenException('Production prompt activation requires permission');
    if (input.rolloutPercentage < 0 || input.rolloutPercentage > 100) throw new ConflictException('Invalid rollout percentage');
    const template = await this.repository.templateById(input.workspaceId, input.templateId);
    if (!template) throw new NotFoundException('Prompt definition not found');
    const candidate = await this.repository.versionNumber(template, input.version);
    if (!candidate || !['approved', 'active'].includes(candidate.status) || candidate.evaluationStatus !== 'passed') throw new ConflictException('Only evaluated and approved prompts may be activated');
    await this.repository.transition(input.workspaceId, input.templateId, input.version, ['approved', 'active'], { status: 'active' });
    const stableVersion = template.activeVersion;
    await this.repository.assign({ workspaceId: input.workspaceId, templateId: input.templateId, feature: input.feature, environment: input.environment, stableVersion, canaryVersion: input.rolloutPercentage < 100 ? input.version : null, rolloutPercentage: input.rolloutPercentage, canaryWorkspaceIds: input.canaryWorkspaceIds ?? [], rollbackVersion: stableVersion });
    if (input.rolloutPercentage === 100) await this.repository.activateTemplate(input.workspaceId, input.templateId, input.version);
    await this.repository.audit({ workspaceId: new Types.ObjectId(input.workspaceId), templateId: new Types.ObjectId(input.templateId), version: input.version, action: 'activate', actorId: new Types.ObjectId(input.userId), reason: input.reason, fromStatus: 'approved', toStatus: 'active' });
    return { version: input.version, rolloutPercentage: input.rolloutPercentage };
  }
  async recordEvaluation(input: { workspaceId: string; templateId: string; version: number; passed: boolean; userId: string; reason: string }) {
    const result = await this.repository.transition(input.workspaceId, input.templateId, input.version, ['draft', 'review', 'approved'], { evaluationStatus: input.passed ? 'passed' : 'failed' });
    if (!result) throw new NotFoundException('Prompt version not found');
    await this.repository.audit({ workspaceId: new Types.ObjectId(input.workspaceId), templateId: new Types.ObjectId(input.templateId), version: input.version, action: 'evaluation_recorded', actorId: new Types.ObjectId(input.userId), reason: input.reason, fromStatus: result.status, toStatus: result.status });
    return result;
  }
  async rollback(input: { workspaceId: string; templateId: string; feature: string; environment: string; userId: string; permissions: Permission[]; reason: string }) {
    if (!input.permissions.includes('agents.manage')) throw new ForbiddenException('Emergency rollback requires permission');
    const template = await this.repository.templateById(input.workspaceId, input.templateId);
    if (!template) throw new NotFoundException('Prompt definition not found');
    const assignment = await this.repository.assignment(input.workspaceId, template._id, input.feature, input.environment);
    if (!assignment?.rollbackVersion) throw new ConflictException('No rollback version is available');
    await Promise.all([this.repository.assign({ workspaceId: input.workspaceId, templateId: input.templateId, feature: input.feature, environment: input.environment, stableVersion: assignment.rollbackVersion, canaryVersion: null, rolloutPercentage: 100, canaryWorkspaceIds: [], rollbackVersion: assignment.stableVersion }), this.repository.activateTemplate(input.workspaceId, input.templateId, assignment.rollbackVersion), this.repository.audit({ workspaceId: new Types.ObjectId(input.workspaceId), templateId: template._id, version: assignment.rollbackVersion, action: 'emergency_rollback', actorId: new Types.ObjectId(input.userId), reason: input.reason, fromStatus: 'active', toStatus: 'active' })]);
    return { activeVersion: assignment.rollbackVersion };
  }
  async compareEvaluations(workspaceId: string, leftVersion: number, rightVersion: number) {
    const rows = await this.repository.evaluations(workspaceId, [String(leftVersion), String(rightVersion)]);
    const latest = new Map<string, Record<string, unknown>>();
    for (const row of rows) if (!latest.has(String(row.promptVersion))) latest.set(String(row.promptVersion), row);
    return { left: latest.get(String(leftVersion)) ?? null, right: latest.get(String(rightVersion)) ?? null };
  }
}
