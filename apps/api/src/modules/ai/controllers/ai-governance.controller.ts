import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { RequireWorkspace } from '../../../common/decorators/require-workspace.decorator.js';
import { WorkspaceContext } from '../../../common/decorators/workspace-context.decorator.js';
import type { WorkspaceRequestContext } from '../../../common/types/workspace-context.js';
import { RequirePermissions } from '../../permissions/decorators/require-permissions.decorator.js';
import { AiFeedbackService } from '../feedback/ai-feedback.service.js';
import { AiAdminReportService } from '../observability/ai-admin-report.service.js';
import { AiObservabilityService } from '../observability/ai-observability.service.js';
import { ProviderHealthService } from '../routing/provider-health.service.js';
import type { AiProviderName } from '../providers/ai-provider.interface.js';
class FeedbackDto {
  @IsIn(['positive', 'negative', 'hallucination', 'unsafe', 'bad_citation']) kind!: 'positive' | 'negative' | 'hallucination' | 'unsafe' | 'bad_citation';
  @IsOptional() @IsString() @MaxLength(2_000) comment?: string;
}
@Controller('ai')
@RequireWorkspace()
export class AiGovernanceController {
  constructor(private readonly feedback: AiFeedbackService, private readonly reports: AiAdminReportService, private readonly observability: AiObservabilityService, private readonly providerHealth: ProviderHealthService) {}
  @Post(':requestId/feedback') @RequirePermissions('agents.manage') submit(@WorkspaceContext() context: WorkspaceRequestContext, @Param('requestId') requestId: string, @Body() body: FeedbackDto) {
    return this.feedback.submit({ workspaceId: context.workspaceId, userId: context.userId, requestId, kind: body.kind, ...(body.comment ? { comment: body.comment } : {}) });
  }
  @Get('admin/reports') @RequirePermissions('agents.manage') report(@WorkspaceContext() context: WorkspaceRequestContext, @Query('since') since?: string) {
    const parsed = since ? new Date(since) : new Date(Date.now() - 30 * 86_400_000);
    return this.reports.generate(context.workspaceId, Number.isNaN(parsed.valueOf()) ? new Date(Date.now() - 30 * 86_400_000) : parsed);
  }
  @Delete(':requestId/private-data') @RequirePermissions('agents.manage') deletePrivateData(@WorkspaceContext() context: WorkspaceRequestContext, @Param('requestId') requestId: string) {
    return this.observability.deletePrivateData(context.workspaceId, requestId);
  }
  @Post('admin/providers/:provider/disable') @RequirePermissions('agents.manage') disableProvider(@Param('provider') provider: AiProviderName) {
    this.assertProvider(provider);
    this.providerHealth.disable(provider);
    return { provider, disabled: true };
  }
  @Post('admin/providers/:provider/enable') @RequirePermissions('agents.manage') enableProvider(@Param('provider') provider: AiProviderName) {
    this.assertProvider(provider);
    this.providerHealth.enable(provider);
    return { provider, disabled: false };
  }
  private assertProvider(value: string): asserts value is AiProviderName {
    if (!['openai', 'gemini', 'groq', 'openrouter', 'ollama'].includes(value)) throw new BadRequestException('Unknown AI provider');
  }
}
