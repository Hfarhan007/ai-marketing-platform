import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, type ClientSession } from 'mongoose';
import { CrmRepository } from '../../crm/crm.repository.js';
import { Deal, type DealDocument } from '../schemas/deal.schema.js';
@Injectable()
export class DealsRepository extends CrmRepository<Deal> {
  constructor(@InjectModel(Deal.name) model: Model<DealDocument>) {
    super(model, new Set(['createdAt', 'updatedAt', 'value', 'expectedCloseDate', 'probability']));
  }
  usedStageIds(workspaceId: string, pipelineId: string, session: ClientSession) {
    return this.model
      .find({
        workspaceId: new Types.ObjectId(workspaceId),
        pipelineId: new Types.ObjectId(pipelineId),
        deletedAt: null,
      })
      .session(session)
      .distinct('stageId')
      .then((values) => new Set(values.map(String)));
  }
  migrateStages(
    workspaceId: string,
    pipelineId: string,
    migrations: Record<string, string>,
    session: ClientSession,
  ) {
    return this.model.bulkWrite(
      Object.entries(migrations).map(([from, to]) => ({
        updateMany: {
          filter: {
            workspaceId: new Types.ObjectId(workspaceId),
            pipelineId: new Types.ObjectId(pipelineId),
            stageId: new Types.ObjectId(from),
          },
          update: {
            $set: { stageId: new Types.ObjectId(to), stageEnteredAt: new Date() },
            $inc: { version: 1 },
          },
        },
      })),
      { session, ordered: false },
    );
  }
}
