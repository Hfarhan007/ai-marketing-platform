import type { NormalizedExternalLead } from '../../../leads/types/external-lead.types.js';
import type { ProviderConnectionContext } from '../../types/provider-adapter.js';
import type { HighLevelAppointment, HighLevelContact, HighLevelOpportunity } from './highlevel.types.js';
export function mapHighLevelContact(context:ProviderConnectionContext,contact:HighLevelContact):NormalizedExternalLead{
 const known=new Set(['id','locationId','firstName','lastName','name','email','phone','companyName','source','dateAdded','dateUpdated']);const fields=Object.fromEntries(Object.entries(contact).filter(([key])=>!known.has(key)));
 return{workspaceId:context.workspaceId,actorId:context.actorId??context.workspaceId,provider:'highlevel',externalLeadId:contact.id,...(contact.firstName?{firstName:contact.firstName}:{}),...(contact.lastName?{lastName:contact.lastName}:{}),...(contact.name?{fullName:contact.name}:{}),...(contact.email?{email:contact.email}:{}),...(contact.phone?{phone:contact.phone}:{}),...(contact.companyName?{company:contact.companyName}:{}),source:contact.source||'highlevel',fields:{...fields,locationId:contact.locationId??context.credentials.locationId??''},rawPayload:contact,receivedAt:new Date(contact.dateAdded??contact.dateUpdated??Date.now()),correlationId:`highlevel:${contact.id}`};
}

export function mapHighLevelOpportunity(opportunity:HighLevelOpportunity){return{externalId:opportunity.id,provider:'highlevel' as const,locationId:opportunity.locationId,contactId:opportunity.contactId,pipelineId:opportunity.pipelineId,pipelineStageId:opportunity.pipelineStageId,name:opportunity.name,status:opportunity.status,monetaryValue:opportunity.monetaryValue,rawPayload:opportunity};}

export function mapHighLevelAppointment(appointment:HighLevelAppointment){return{externalId:appointment.id,provider:'highlevel' as const,locationId:appointment.locationId,contactId:appointment.contactId,calendarId:appointment.calendarId,title:appointment.title,startTime:appointment.startTime,endTime:appointment.endTime,status:appointment.appointmentStatus,rawPayload:appointment};}
