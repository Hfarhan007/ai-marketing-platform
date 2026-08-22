import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import type { WorkspaceRequestContext } from '../../../common/types/workspace-context.js';
import { Appointment } from '../../appointments/schemas/appointment.schema.js';
import { Campaign } from '../../campaigns/schemas/campaign.schemas.js';
import { Deal } from '../../deals/schemas/deal.schema.js';
import { MetaInsightsService } from '../../integrations/providers/meta/meta-insights.service.js';
import { IntegrationService } from '../../integrations/services/integration.service.js';
import { Lead } from '../../leads/schemas/lead.schema.js';
import type { SourceReportQueryDto } from '../dto/source-report.dto.js';
interface Bucket { source:string;totalLeads:number;newLeads:number;qualifiedLeads:number;disqualifiedLeads:number;appointments:number;deals:number;revenue:number;adCost:number }
@Injectable()
export class SourceReportService {
  constructor(@InjectModel(Lead.name) private readonly leads:Model<Lead>,@InjectModel(Appointment.name) private readonly appointments:Model<Appointment>,@InjectModel(Deal.name) private readonly deals:Model<Deal>,@InjectModel(Campaign.name) private readonly campaigns:Model<Campaign>,private readonly integrations:IntegrationService,private readonly metaInsights:MetaInsightsService) {}
  async report(c:WorkspaceRequestContext,q:SourceReportQueryDto) {
    const since=new Date(q.since),until=new Date(q.until);until.setUTCHours(23,59,59,999);
    if(!Number.isFinite(since.valueOf())||!Number.isFinite(until.valueOf())||since>until)throw new BadRequestException('Invalid reporting date range');
    if((until.getTime()-since.getTime())/86400000>366)throw new BadRequestException('Source report date range cannot exceed 366 days');
    const workspaceId=new Types.ObjectId(c.workspaceId),campaignIds=q.campaignIds.map((id)=>new Types.ObjectId(id));
    const allLeadRows=await this.leads.find({workspaceId,deletedAt:null,createdAt:{$gte:since,$lte:until},...(campaignIds.length?{campaignId:{$in:campaignIds}}:{})}).select('source status qualification campaignId conversion').lean<Lead[]>().exec();
    const selectedSources=new Set(q.sources.map((source)=>this.source(source))),leadRows=q.sources.length?allLeadRows.filter((lead)=>selectedSources.has(this.source(lead.source))):allLeadRows;
    const contactIds=leadRows.flatMap((lead)=>lead.conversion?.contactId?[new Types.ObjectId(lead.conversion.contactId)]:[]),dealIds=leadRows.flatMap((lead)=>lead.conversion?.dealId?[new Types.ObjectId(lead.conversion.dealId)]:[]);
    const [appointmentRows,dealRows,campaignRows]=await Promise.all([
      contactIds.length?this.appointments.find({workspaceId,customerId:{$in:contactIds},deletedAt:null,startAt:{$gte:since,$lte:until}}).select('customerId').lean<Appointment[]>().exec():[],
      contactIds.length||dealIds.length?this.deals.find({workspaceId,deletedAt:null,$or:[...(contactIds.length?[{contactId:{$in:contactIds}}]:[]),...(dealIds.length?[{_id:{$in:dealIds}}]:[])]}).select('contactId attributedRevenue').lean<Deal[]>().exec():[],
      this.campaigns.find({workspaceId,...(campaignIds.length?{_id:{$in:campaignIds}}:{})}).select('name externalCampaignId integrationConnectionId').lean<Campaign[]>().exec(),
    ]);
    const appointmentCount=new Map<string,number>(),dealsByContact=new Map<string,Deal[]>();
    for(const row of appointmentRows)appointmentCount.set(String(row.customerId),(appointmentCount.get(String(row.customerId))??0)+1);
    for(const row of dealRows){const id=String(row.contactId??'');if(id)dealsByContact.set(id,[...(dealsByContact.get(id)??[]),row]);}
    const buckets=new Map<string,Bucket>();
    for(const lead of leadRows){const source=this.source(lead.source),bucket=buckets.get(source)??{source,totalLeads:0,newLeads:0,qualifiedLeads:0,disqualifiedLeads:0,appointments:0,deals:0,revenue:0,adCost:0},contactId=lead.conversion?.contactId??'',leadDeals=dealsByContact.get(contactId)??[];bucket.totalLeads+=1;if(lead.status==='new')bucket.newLeads+=1;if(['marketing_qualified','sales_qualified'].includes(lead.qualification))bucket.qualifiedLeads+=1;if(lead.qualification==='disqualified'||lead.status==='disqualified')bucket.disqualifiedLeads+=1;bucket.appointments+=appointmentCount.get(contactId)??0;bucket.deals+=leadDeals.length;bucket.revenue+=leadDeals.reduce((sum,deal)=>sum+(deal.attributedRevenue||0),0);buckets.set(source,bucket);}
    await this.addMetaCost(c,campaignRows,since,until,buckets);
    const items=[...buckets.values()].map((item)=>({...item,qualificationRate:this.rate(item.qualifiedLeads,item.totalLeads),appointmentRate:this.rate(item.appointments,item.totalLeads),dealConversionRate:this.rate(item.deals,item.totalLeads),cpl:item.totalLeads?item.adCost/item.totalLeads:null,cpa:item.deals?item.adCost/item.deals:null,roas:item.adCost>0&&item.revenue>0?item.revenue/item.adCost:null})).sort((a,b)=>b.totalLeads-a.totalLeads);
    return {since:q.since,until:q.until,workspaceId:c.workspaceId,items,totals:this.totals(items),availableSources:items.map(({source})=>source),campaigns:campaignRows.map((campaign)=>({id:String(campaign._id),name:campaign.name}))};
  }
  private async addMetaCost(c:WorkspaceRequestContext,campaigns:Campaign[],since:Date,until:Date,buckets:Map<string,Bucket>) {
    const connections=(await this.integrations.list(c)).items.filter(({provider,status})=>(provider==='facebook'||provider==='instagram')&&status==='active');
    for(const connection of connections){try{const report=await this.metaInsights.report(await this.integrations.context(c.workspaceId,connection.id),{since:since.toISOString().slice(0,10),until:until.toISOString().slice(0,10),level:'campaign',daily:false,limit:100}),allowed=new Set(campaigns.filter((campaign)=>String(campaign.integrationConnectionId)===connection.id).map(({externalCampaignId})=>externalCampaignId).filter(Boolean)),rows=(report as{items:Array<{campaignId?:string;spend:number}>}).items,cost=rows.filter((row)=>!allowed.size||allowed.has(row.campaignId??'')).reduce((sum,row)=>sum+row.spend,0),bucket=buckets.get(this.source(connection.provider));if(bucket)bucket.adCost+=cost;}catch{/* CRM metrics remain available when provider reporting is unavailable. */}}
  }
  private source(value:string){const source=value.trim().toLowerCase().replace(/[ _-]+/gu,' ');if(source==='facebook'||source==='fb')return'Facebook';if(source==='instagram'||source==='ig')return'Instagram';if(source==='website'||source==='web')return'Website';if(source==='landing page'||source==='landing pages')return'Landing Pages';if(['highlevel','gohighlevel','go high level'].includes(source))return'GoHighLevel';if(source==='google')return'Google';if(source==='linkedin'||source==='linked in')return'LinkedIn';if(source==='tiktok'||source==='tik tok')return'TikTok';if(source==='manual')return'Manual';if(source==='csv'||source==='csv import')return'CSV';return'Other';}
  private rate(value:number,total:number){return total?value/total*100:0;}
  private totals(items:Array<Bucket&{qualificationRate:number;appointmentRate:number;dealConversionRate:number;cpl:number|null;cpa:number|null;roas:number|null}>){const total=items.reduce((sum,item)=>({totalLeads:sum.totalLeads+item.totalLeads,newLeads:sum.newLeads+item.newLeads,qualifiedLeads:sum.qualifiedLeads+item.qualifiedLeads,disqualifiedLeads:sum.disqualifiedLeads+item.disqualifiedLeads,appointments:sum.appointments+item.appointments,deals:sum.deals+item.deals,revenue:sum.revenue+item.revenue,adCost:sum.adCost+item.adCost}),{totalLeads:0,newLeads:0,qualifiedLeads:0,disqualifiedLeads:0,appointments:0,deals:0,revenue:0,adCost:0});return{...total,qualificationRate:this.rate(total.qualifiedLeads,total.totalLeads),appointmentRate:this.rate(total.appointments,total.totalLeads),dealConversionRate:this.rate(total.deals,total.totalLeads),cpl:total.totalLeads?total.adCost/total.totalLeads:null,cpa:total.deals?total.adCost/total.deals:null,roas:total.adCost>0&&total.revenue>0?total.revenue/total.adCost:null};}
}
