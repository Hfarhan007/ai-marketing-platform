import { Body, Controller, Param, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator.js';
import { RequireWorkspace } from '../../../common/decorators/require-workspace.decorator.js';
import { WorkspaceContext } from '../../../common/decorators/workspace-context.decorator.js';
import { ParseMongoIdPipe } from '../../../common/pipes/parse-mongo-id.pipe.js';
import type { WorkspaceRequestContext } from '../../../common/types/workspace-context.js';
import { RequirePermissions } from '../../permissions/decorators/require-permissions.decorator.js';
import { BeginOAuthDto, CreateConnectionDto, OAuthCallbackDto, SyncDto } from '../dto/integration.dto.js';
import { IntegrationService } from '../services/integration.service.js';
interface IntegrationRawRequest { rawBody?:Buffer; headers:Record<string,string|string[]|undefined> }
@ApiTags('integrations') @Controller('integrations')
export class IntegrationController {
 constructor(private readonly service:IntegrationService){}
 @Post('connections') @RequireWorkspace() @RequirePermissions('integrations.manage') create(@WorkspaceContext()c:WorkspaceRequestContext,@Body()d:CreateConnectionDto){return this.service.create(c,d)}
 @Post('connections/:id/oauth') @RequireWorkspace() @RequirePermissions('integrations.manage') oauth(@WorkspaceContext()c:WorkspaceRequestContext,@Param('id',ParseMongoIdPipe)id:string,@Body()d:BeginOAuthDto){return this.service.beginOAuth(c,id,d.redirectUri)}
 @Public() @Post('oauth/callback') callback(@Body()d:OAuthCallbackDto){return this.service.callback(d)}
 @Post('connections/:id/disconnect') @RequireWorkspace() @RequirePermissions('integrations.manage') disconnect(@WorkspaceContext()c:WorkspaceRequestContext,@Param('id',ParseMongoIdPipe)id:string){return this.service.disconnect(c,id)}
 @Post('connections/:id/refresh') @RequireWorkspace() @RequirePermissions('integrations.manage') refresh(@WorkspaceContext()c:WorkspaceRequestContext,@Param('id',ParseMongoIdPipe)id:string){return this.service.refresh(c,id)}
 @Post('connections/:id/validate') @RequireWorkspace() @RequirePermissions('integrations.manage') validate(@WorkspaceContext()c:WorkspaceRequestContext,@Param('id',ParseMongoIdPipe)id:string){return this.service.validate(c,id)}
 @Post('connections/:id/sync') @RequireWorkspace() @RequirePermissions('integrations.manage') sync(@WorkspaceContext()c:WorkspaceRequestContext,@Param('id',ParseMongoIdPipe)id:string,@Body()d:SyncDto){return this.service.sync(c,id,d)}
 @Post('connections/:id/health') @RequireWorkspace() @RequirePermissions('integrations.read') health(@WorkspaceContext()c:WorkspaceRequestContext,@Param('id',ParseMongoIdPipe)id:string){return this.service.health(c,id)}
 @Public() @Post('webhooks/:workspaceId/:connectionId') webhook(@Param('workspaceId',ParseMongoIdPipe)workspaceId:string,@Param('connectionId',ParseMongoIdPipe)connectionId:string,@Req()request:IntegrationRawRequest){if(!request.rawBody)throw new Error('Raw body is unavailable');const headers=Object.fromEntries(Object.entries(request.headers).map(([key,value])=>[key,Array.isArray(value)?value[0]:value]));return this.service.webhook(workspaceId,connectionId,request.rawBody,headers)}
}
