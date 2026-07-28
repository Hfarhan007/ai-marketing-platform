import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

@Schema({ collection: 'crm_audit_events', timestamps: { createdAt: true, updatedAt: false } })
export class CrmAuditEvent {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
  workspaceId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  actorId!: Types.ObjectId;
  @Prop({ type: String, required: true })
  entityType!: string;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  entityId!: Types.ObjectId;
  @Prop({ type: String, required: true })
  action!: string;
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  metadata!: Record<string, string | number | boolean>;
}
export type CrmAuditEventDocument = HydratedDocument<CrmAuditEvent>;
export const CrmAuditEventSchema = SchemaFactory.createForClass(CrmAuditEvent);
CrmAuditEventSchema.index({ workspaceId: 1, createdAt: -1 });

@Schema({ collection: 'crm_domain_events', timestamps: { createdAt: true, updatedAt: false } })
export class CrmDomainEvent {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
  workspaceId!: Types.ObjectId;
  @Prop({ type: String, required: true })
  type!: string;
  @Prop({ type: String, required: true })
  aggregateType!: string;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  aggregateId!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  metadata!: Record<string, string | number | boolean>;
  @Prop({ type: Date, default: null })
  publishedAt!: Date | null;
}
export type CrmDomainEventDocument = HydratedDocument<CrmDomainEvent>;
export const CrmDomainEventSchema = SchemaFactory.createForClass(CrmDomainEvent);
CrmDomainEventSchema.index({ workspaceId: 1, publishedAt: 1, createdAt: 1 });
