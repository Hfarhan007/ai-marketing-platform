import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { ClientSession, Model } from 'mongoose';
import { Types } from 'mongoose';
import { CrmRepository } from '../../crm/crm.repository.js';
import { Appointment, type AppointmentDocument } from '../schemas/appointment.schema.js';
@Injectable()
export class AppointmentsRepository extends CrmRepository<Appointment> {
  constructor(@InjectModel(Appointment.name) model: Model<AppointmentDocument>) {
    super(model, new Set(['createdAt', 'startAt', 'endAt', 'status']));
  }
  findByIdempotency(workspaceId: string, key: string, session?: ClientSession) {
    return this.model
      .findOne({ workspaceId: new Types.ObjectId(workspaceId), idempotencyKey: key })
      .session(session ?? null)
      .lean<Appointment>()
      .exec();
  }
  findConflict(
    workspaceId: string,
    staffId: string,
    start: Date,
    end: Date,
    excludeId?: string,
    session?: ClientSession,
  ) {
    return this.model
      .findOne({
        workspaceId: new Types.ObjectId(workspaceId),
        staffId: new Types.ObjectId(staffId),
        status: { $in: ['reserved', 'confirmed'] },
        deletedAt: null,
        startAt: { $lt: end },
        endAt: { $gt: start },
        ...(excludeId ? { _id: { $ne: new Types.ObjectId(excludeId) } } : {}),
      })
      .session(session ?? null)
      .lean<Appointment>()
      .exec();
  }
}
