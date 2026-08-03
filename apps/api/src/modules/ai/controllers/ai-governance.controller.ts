import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { IsArray, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { RequireWorkspace } from '../../../common/decorators/require-workspace.decorator.js';
import { WorkspaceContext } from '../../../common/decorators/workspace-context.decorator.js';
import type { WorkspaceRequestContext } from '../../../common/types/workspace-context.js';
import { RequirePermissions } from '../../permissions/decorators/require-permissions.decorator.js';
import { AiFeedbackService } from '../feedback/ai-feedback.service.js';
import { AiAdminReportService } from '../observability/ai-admin-report.service.js';
import { AiObservabilityService } from '../observability/ai-observability.service.js';
import { ProviderHealthService } from '../routing/provider-health.service.js';
import type { AiProviderName } from '../providers/ai-provider.interface.js';
import { AiReliabilityMetricsService } from '../reliability/ai-reliability-metrics.service.js';
import { AiAsyncExecutionService } from '../control-plane/ai-async-execution.service.js';
class FeedbackDto {
  @IsIn(['thumbs_up', 'thumbs_down']) kind!: 'thumbs_up' | 'thumbs_down';
  @IsOptional() @IsArray() @IsIn(['incorrect_fact', 'missing_source', 'unsafe_response', 'bad_tool_action', 'irrelevant_answer', 'poor_tone', 'escalation_required'], { each: true }) reasonCodes?: Array<'incorrect_fact' | 'missing_source' | 'unsafe_response' | 'bad_tool_action' | 'irrelevant_answer' | 'poor_tone' | 'escalation_required'>;
  @IsOptional() @IsString() @MaxLength(2_000) comment?: string;
  @IsOptional() @IsString() @MaxLength(30_000) editedResponse?: string;
  @IsOptional() @IsString() @MaxLength(2_000) incorrectFact?: string;
  @IsOptional() @IsString() @MaxLength(30_000) inputSnapshot?: string;
  @IsOptional() @IsString() @MaxLength(30_000) outputSnapshot?: string;
}
class AdjudicationDto { @IsIn(['approved', 'rejected', 'needs_more_information']) decision!: 'approved' | 'rejected' | 'needs_more_information'; @IsOptional() @IsString() @MaxLength(2_000) notes?: string; }
@Controller('ai')
@RequireWorkspace()
export class AiGovernanceController {
  constructor(private readonly feedback: AiFeedbackService, private readonly reports: AiAdminReportService, private readonly observability: AiObservabilityService, private readonly providerHealth: ProviderHealthService, private readonly reliabilityMetrics: AiReliabilityMetricsService, private readonly asyncExecutions: AiAsyncExecutionService) {}
  @Post(':requestId/feedback') @RequirePermissions('agents.manage') submit(@WorkspaceContext() context: WorkspaceRequestContext, @Param('requestId') requestId: string, @Body() body: FeedbackDto) {
    return this.feedback.submit({ workspaceId: context.workspaceId, userId: context.userId, userRoles: context.roleIds, executionId: requestId, kind: body.kind, ...(body.reasonCodes ? { reasonCodes: body.reasonCodes } : {}), ...(body.comment ? { comment: body.comment } : {}), ...(body.editedResponse ? { editedResponse: body.editedResponse } : {}), ...(body.incorrectFact ? { incorrectFact: body.incorrectFact } : {}), ...(body.inputSnapshot ? { inputSnapshot: body.inputSnapshot } : {}), ...(body.outputSnapshot ? { outputSnapshot: body.outputSnapshot } : {}) });
  }
  @Get('admin/feedback/queue') @RequirePermissions('agents.manage') feedbackQueue(@WorkspaceContext() context: WorkspaceRequestContext, @Query('queue') queue = 'quality', @Query('status') status = 'unresolved') { return this.feedback.queue(context.workspaceId, queue, status); }
  @Post('admin/feedback/:feedbackId/claim') @RequirePermissions('agents.manage') claimFeedback(@WorkspaceContext() context: WorkspaceRequestContext, @Param('feedbackId') feedbackId: string) { return this.feedback.claim(context.workspaceId, feedbackId, context.userId); }
  @Post('admin/feedback/:feedbackId/adjudicate') @RequirePermissions('agents.manage') adjudicateFeedback(@WorkspaceContext() context: WorkspaceRequestContext, @Param('feedbackId') feedbackId: string, @Body() body: AdjudicationDto) { return this.feedback.adjudicate({ workspaceId: context.workspaceId, feedbackId, reviewerId: context.userId, decision: body.decision, ...(body.notes ? { notes: body.notes } : {}) }); }
  @Get('admin/feedback/comparison') @RequirePermissions('agents.manage') compareFeedback(@WorkspaceContext() context: WorkspaceRequestContext, @Query('since') since?: string) { const parsed = since ? new Date(since) : new Date(Date.now() - 30 * 86_400_000); return this.feedback.compareAndAlert(context.workspaceId, Number.isNaN(parsed.valueOf()) ? new Date(Date.now() - 30 * 86_400_000) : parsed, 0.2); }
  @Get('admin/reports') @RequirePermissions('agents.manage') report(@WorkspaceContext() context: WorkspaceRequestContext, @Query('since') since?: string) {
    const parsed = since ? new Date(since) : new Date(Date.now() - 30 * 86_400_000);
    return this.reports.generate(context.workspaceId, Number.isNaN(parsed.valueOf()) ? new Date(Date.now() - 30 * 86_400_000) : parsed);
  }
  @Get('admin/reliability') @RequirePermissions('agents.manage') reliability(@WorkspaceContext() context: WorkspaceRequestContext, @Query('since') since?: string) { const parsed = since ? new Date(since) : new Date(Date.now() - 86_400_000); return this.reliabilityMetrics.report(context.workspaceId, Number.isNaN(parsed.valueOf()) ? new Date(Date.now() - 86_400_000) : parsed); }
  @Post(':requestId/cancel') @RequirePermissions('agents.manage') cancel(@Param('requestId') requestId: string) { return this.asyncExecutions.cancel(requestId); }
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
