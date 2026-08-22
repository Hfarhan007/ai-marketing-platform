import { Controller, Get, Param, Post, Query, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation,ApiResponse,ApiTags } from '@nestjs/swagger';
import { Public } from '../../../../common/decorators/public.decorator.js';
import { ParseMongoIdPipe } from '../../../../common/pipes/parse-mongo-id.pipe.js';
import { IntegrationService } from '../../services/integration.service.js';
import { WebhookAcceptedResponseDto } from '../../dto/integration-response.dto.js';

interface MetaRawRequest { rawBody?:Buffer;headers:Record<string,string|string[]|undefined> }
interface MetaReply { code(status:number):{send(value:string):unknown} }
@ApiTags('integrations-meta')
@Controller('integrations/meta/webhooks')
export class MetaWebhookController {
  constructor(private readonly config:ConfigService,private readonly integrations:IntegrationService){}
  @Public()
  @Get(':workspaceId/:connectionId')
  @ApiOperation({summary:'Verify a Meta webhook subscription',description:'Public Meta challenge endpoint. Validates hub.mode and the configured verify token; no bearer authentication or workspace header is required.'})
  @ApiResponse({status:200,description:'Exact hub.challenge text'}) @ApiResponse({status:403,description:'Verification mode or token is invalid'})
  verify(@Param('workspaceId',ParseMongoIdPipe)_workspaceId:string,@Param('connectionId',ParseMongoIdPipe)_connectionId:string,@Query('hub.mode')mode:string,@Query('hub.verify_token')token:string,@Query('hub.challenge')challenge:string,@Res()reply:MetaReply){
    void _workspaceId;void _connectionId;
    const expected=this.config.get<string>('integrations.meta.webhookVerifyToken');
    if(mode!=='subscribe'||!expected||token!==expected)return reply.code(403).send('Forbidden');
    return reply.code(200).send(challenge);
  }
  @Public()
  @Post(':workspaceId/:connectionId')
  @ApiOperation({summary:'Receive a signed Meta webhook delivery',description:'Public provider endpoint. X-Hub-Signature-256 is verified against the exact raw body before any event is persisted.'})
  @ApiResponse({status:200,type:WebhookAcceptedResponseDto,description:'Webhook accepted or identified as a duplicate'}) @ApiResponse({status:400,description:'Malformed Meta payload'}) @ApiResponse({status:401,description:'Missing or invalid App Secret signature'}) @ApiResponse({status:404,description:'Workspace-scoped connection not found'}) @ApiResponse({status:429,description:'Webhook rate limit reached'})
  receive(@Param('workspaceId',ParseMongoIdPipe)workspaceId:string,@Param('connectionId',ParseMongoIdPipe)connectionId:string,@Req()request:MetaRawRequest){
    if(!request.rawBody)throw new Error('Raw body is unavailable');
    const headers=Object.fromEntries(Object.entries(request.headers).map(([key,value])=>[key,Array.isArray(value)?value[0]:value]));
    return this.integrations.webhook(workspaceId,connectionId,request.rawBody,headers);
  }
}
