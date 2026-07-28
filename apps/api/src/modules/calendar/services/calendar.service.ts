import { Injectable } from '@nestjs/common';
import type { WorkspaceRequestContext } from '../../../common/types/workspace-context.js';
import { AppointmentsRepository } from '../../appointments/repositories/appointments.repository.js';
import { assertRange, parseInstant } from '../../scheduling/time.js';
@Injectable()
export class CalendarService {
  constructor(private readonly appointments: AppointmentsRepository) {}
  async range(context: WorkspaceRequestContext, startValue: string, endValue: string) {
    const start = parseInstant(startValue); const end = parseInstant(endValue); assertRange(start, end);
    const items = await this.appointments.findMany(context.workspaceId, { deletedAt: null, startAt: { $lt: end }, endAt: { $gt: start } });
    return { start, end, items: items.map((value) => ({ id: String(value._id), staffId: String(value.staffId), customerId: String(value.customerId), serviceId: String(value.serviceId), start: value.startAt, end: value.endAt, status: value.status, timezone: value.timezone })) };
  }
}
