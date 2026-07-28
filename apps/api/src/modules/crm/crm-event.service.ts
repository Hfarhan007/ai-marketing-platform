import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CrmAuditEvent, type CrmAuditEventDocument, CrmDomainEvent, type CrmDomainEventDocument } from './crm.schema.js';
import type { CrmEvent } from './crm.types.js';

@Injectable()
export class CrmEventService {
  constructor(
    @InjectModel(CrmAuditEvent.name) private readonly audits: Model<CrmAuditEventDocument>,
    @InjectModel(CrmDomainEvent.name) private readonly events: Model<CrmDomainEventDocument>,
  ) {}

  async record(event: CrmEvent): Promise<void> {
    const common = {
      workspaceId: new Types.ObjectId(event.workspaceId),
      metadata: event.metadata ?? {},
    };
    const audit = new this.audits({
        ...common,
        actorId: new Types.ObjectId(event.actorId),
        entityType: event.entityType,
        entityId: new Types.ObjectId(event.entityId),
        action: event.action,
      });
    const domainEvent = new this.events({
        ...common,
        type: `${event.entityType}.${event.action}`,
        aggregateType: event.entityType,
        aggregateId: new Types.ObjectId(event.entityId),
        publishedAt: null,
      });
    await Promise.all([
      audit.save(event.session ? { session: event.session } : {}),
      domainEvent.save(event.session ? { session: event.session } : {}),
    ]);
  }
}
