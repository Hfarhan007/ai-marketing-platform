import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequireWorkspace } from '../../../common/decorators/require-workspace.decorator.js';
import { WorkspaceContext } from '../../../common/decorators/workspace-context.decorator.js';
import { ParseMongoIdPipe } from '../../../common/pipes/parse-mongo-id.pipe.js';
import type { WorkspaceRequestContext } from '../../../common/types/workspace-context.js';
import { RequirePermissions } from '../../permissions/decorators/require-permissions.decorator.js';
import { CreateMetaAdDto,CreateMetaAdSetDto,CreateMetaCampaignDto,CreateMetaCreativeDto,CreateMetaCustomAudienceDto,CreateMetaLookalikeDto,MetaInsightsQueryDto,MetaStatusDto,UpdateMetaAdDto,UpdateMetaAdSetDto,UpdateMetaCampaignDto } from '../dto/meta-campaign.dto.js';
import { MetaCampaignManagementService } from '../services/meta-campaign-management.service.js';
@ApiTags('campaigns-meta')@Controller('campaigns/meta')@RequireWorkspace()
export class MetaCampaignController{
 constructor(private readonly service:MetaCampaignManagementService){}
 @Get()@RequirePermissions('campaigns.read')list(@WorkspaceContext()c:WorkspaceRequestContext,@Query('connectionId')connectionId:string){return this.service.list(c,connectionId);}
 @Post()@RequirePermissions('campaigns.manage')create(@WorkspaceContext()c:WorkspaceRequestContext,@Body()d:CreateMetaCampaignDto){return this.service.create(c,d);}
 @Get('audiences')@RequirePermissions('campaigns.read')audiences(@WorkspaceContext()c:WorkspaceRequestContext,@Query('connectionId')connectionId:string){return this.service.audiences(c,connectionId);}
 @Post('audiences/custom')@RequirePermissions('campaigns.manage')customAudience(@WorkspaceContext()c:WorkspaceRequestContext,@Body()d:CreateMetaCustomAudienceDto){return this.service.customAudience(c,d);}
 @Get('targeting')@RequirePermissions('campaigns.read')targeting(@WorkspaceContext()c:WorkspaceRequestContext,@Query('connectionId')connectionId:string,@Query('q')query:string,@Query('type')type?:string){return this.service.targeting(c,connectionId,query,type);}
 @Get('insights')@RequirePermissions('campaigns.read')insights(@WorkspaceContext()c:WorkspaceRequestContext,@Query()d:MetaInsightsQueryDto){return this.service.report(c,d);}
 @Post('audiences/lookalike')@RequirePermissions('campaigns.manage')lookalike(@WorkspaceContext()c:WorkspaceRequestContext,@Body()d:CreateMetaLookalikeDto){return this.service.lookalike(c,d);}
 @Get(':id')@RequirePermissions('campaigns.read')get(@WorkspaceContext()c:WorkspaceRequestContext,@Param('id',ParseMongoIdPipe)id:string){return this.service.get(c,id);}
 @Patch(':id')@RequirePermissions('campaigns.manage')update(@WorkspaceContext()c:WorkspaceRequestContext,@Param('id',ParseMongoIdPipe)id:string,@Body()d:UpdateMetaCampaignDto){return this.service.update(c,id,d);}
 @Post(':id/status')@RequirePermissions('campaigns.manage')status(@WorkspaceContext()c:WorkspaceRequestContext,@Param('id',ParseMongoIdPipe)id:string,@Body()d:MetaStatusDto){return this.service.status(c,id,d.connectionId,d.status);}
 @Get(':id/adsets')@RequirePermissions('campaigns.read')adsets(@WorkspaceContext()c:WorkspaceRequestContext,@Param('id',ParseMongoIdPipe)id:string,@Query('connectionId')connectionId:string){return this.service.listAdSets(c,id,connectionId);}
 @Post(':id/adsets')@RequirePermissions('campaigns.manage')createAdSet(@WorkspaceContext()c:WorkspaceRequestContext,@Param('id',ParseMongoIdPipe)id:string,@Body()d:CreateMetaAdSetDto){return this.service.createAdSet(c,id,d);}
 @Patch(':id/adsets/:adSetId')@RequirePermissions('campaigns.manage')updateAdSet(@WorkspaceContext()c:WorkspaceRequestContext,@Param('id',ParseMongoIdPipe)id:string,@Param('adSetId')adSetId:string,@Body()d:UpdateMetaAdSetDto){return this.service.updateAdSet(c,id,adSetId,d);}
 @Post(':id/adsets/:adSetId/status')@RequirePermissions('campaigns.manage')adSetStatus(@WorkspaceContext()c:WorkspaceRequestContext,@Param('id',ParseMongoIdPipe)id:string,@Param('adSetId')adSetId:string,@Body()d:MetaStatusDto){return this.service.adSetStatus(c,id,adSetId,d.connectionId,d.status);}
 @Get(':id/ads')@RequirePermissions('campaigns.read')ads(@WorkspaceContext()c:WorkspaceRequestContext,@Param('id',ParseMongoIdPipe)id:string,@Query('connectionId')connectionId:string,@Query('adSetId')adSetId?:string){return this.service.listAds(c,id,connectionId,adSetId);}
 @Post(':id/ads')@RequirePermissions('campaigns.manage')createAd(@WorkspaceContext()c:WorkspaceRequestContext,@Param('id',ParseMongoIdPipe)id:string,@Body()d:CreateMetaAdDto){return this.service.createAd(c,id,d);}
 @Get(':id/ads/:adId')@RequirePermissions('campaigns.read')ad(@WorkspaceContext()c:WorkspaceRequestContext,@Param('id',ParseMongoIdPipe)id:string,@Param('adId')adId:string,@Query('connectionId')connectionId:string){return this.service.getAd(c,id,adId,connectionId);}
 @Patch(':id/ads/:adId')@RequirePermissions('campaigns.manage')updateAd(@WorkspaceContext()c:WorkspaceRequestContext,@Param('id',ParseMongoIdPipe)id:string,@Param('adId')adId:string,@Body()d:UpdateMetaAdDto){return this.service.updateAd(c,id,adId,d);}
 @Post(':id/ads/:adId/status')@RequirePermissions('campaigns.manage')adStatus(@WorkspaceContext()c:WorkspaceRequestContext,@Param('id',ParseMongoIdPipe)id:string,@Param('adId')adId:string,@Body()d:MetaStatusDto){return this.service.adStatus(c,id,adId,d.connectionId,d.status);}
 @Post(':id/creatives')@RequirePermissions('campaigns.manage')creative(@WorkspaceContext()c:WorkspaceRequestContext,@Param('id',ParseMongoIdPipe)id:string,@Body()d:CreateMetaCreativeDto){return this.service.createCreative(c,id,d);}
}
