import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import type { OrchestrationAuditPort } from '../orchestration/orchestration.types.js';
import { AgentOrchestrationRun } from '../schemas/agent.schemas.js';

@Injectable()
export class OrchestrationAuditRepository implements OrchestrationAuditPort {
  constructor(@InjectModel(AgentOrchestrationRun.name) private readonly records: Model<AgentOrchestrationRun>) {}
  record(value: Parameters<OrchestrationAuditPort['record']>[0]) { return new this.records({ ...value, workspaceId: new Types.ObjectId(value.workspaceId) }).save().then(() => undefined); }
}
