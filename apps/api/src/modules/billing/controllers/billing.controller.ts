import { Body, Controller, Get, Headers, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator.js';
import { RequireWorkspace } from '../../../common/decorators/require-workspace.decorator.js';
import { WorkspaceContext } from '../../../common/decorators/workspace-context.decorator.js';
import type { WorkspaceRequestContext } from '../../../common/types/workspace-context.js';
import { RequirePermissions } from '../../permissions/decorators/require-permissions.decorator.js';
import {
  CancelSubscriptionDto,
  ChangePlanDto,
  RecordUsageDto,
  StartSubscriptionDto,
} from '../dto/billing.dto.js';
import { BillingService } from '../services/billing.service.js';
import { BillingWebhookService } from '../services/billing-webhook.service.js';
interface RawRequest {
  rawBody?: Buffer;
}
@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(
    private readonly billing: BillingService,
    private readonly webhooks: BillingWebhookService,
  ) {}
  @Get('plans') plans() {
    return this.billing.plans();
  }
  @Get('subscription') @RequireWorkspace() @RequirePermissions('billing.manage') current(
    @WorkspaceContext() c: WorkspaceRequestContext,
  ) {
    return this.billing.current(c);
  }
  @Post('subscriptions') @RequireWorkspace() @RequirePermissions('billing.manage') start(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Body() d: StartSubscriptionDto,
  ) {
    return this.billing.start(c, d);
  }
  @Post('subscriptions/change-plan')
  @RequireWorkspace()
  @RequirePermissions('billing.manage')
  change(@WorkspaceContext() c: WorkspaceRequestContext, @Body() d: ChangePlanDto) {
    return this.billing.changePlan(c, d);
  }
  @Post('subscriptions/cancel') @RequireWorkspace() @RequirePermissions('billing.manage') cancel(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Body() d: CancelSubscriptionDto,
  ) {
    return this.billing.cancel(c, d.atPeriodEnd);
  }
  @Post('usage') @RequireWorkspace() record(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Body() d: RecordUsageDto,
  ) {
    return this.billing.recordUsage(c, d);
  }
  @Get('entitlements') @RequireWorkspace() entitlements(
    @WorkspaceContext() c: WorkspaceRequestContext,
  ) {
    return this.billing.entitlements(c.workspaceId);
  }
  @Post('usage/snapshot') @RequireWorkspace() @RequirePermissions('billing.manage') snapshot(
    @WorkspaceContext() c: WorkspaceRequestContext,
  ) {
    return this.billing.snapshot(c.workspaceId);
  }
  @Public() @Post('webhooks/stripe') webhook(
    @Req() req: RawRequest,
    @Headers('stripe-signature') signature?: string,
  ) {
    if (!req.rawBody || !signature) throw new Error('Webhook payload or signature is unavailable');
    return this.webhooks.receive(req.rawBody, signature);
  }
}
