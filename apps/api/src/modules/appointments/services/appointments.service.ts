import { ConflictException, Injectable } from '@nestjs/common';
import type { WorkspaceRequestContext } from '../../../common/types/workspace-context.js';
import { TransactionManagerService } from '../../../database/transactions/transaction-manager.service.js';
import { CrmEventService } from '../../crm/crm-event.service.js';
import { AvailabilityRepository } from '../../availability/repositories/availability.repository.js';
import type { CrmListQueryDto } from '../../crm/crm.dto.js';
import { SchedulingJobsService } from '../../scheduling/scheduling-jobs.service.js';
import { SchedulingLockService } from '../../scheduling/scheduling-lock.service.js';
import { assertRange, assertTimeZone, parseInstant } from '../../scheduling/time.js';
import { assertAvailable } from '../../scheduling/availability-policy.js';
import { ServicesRepository } from '../../services/repositories/services.repository.js';
import { CancelAppointmentDto, CreateAppointmentDto, RescheduleAppointmentDto } from '../dto/appointment.dto.js';
import { AppointmentsRepository } from '../repositories/appointments.repository.js';
import type { Appointment } from '../schemas/appointment.schema.js';
const map = (v: Appointment) => ({ id: String(v._id), customerId: String(v.customerId), staffId: String(v.staffId), serviceId: String(v.serviceId), start: v.startAt, end: v.endAt, timezone: v.timezone, status: v.status, location: v.location, meetingLink: v.meetingLink, reminders: v.reminders, notes: v.notes, cancellationReason: v.cancellationReason, noShow: v.noShow, version: v.version, createdAt: v.createdAt, updatedAt: v.updatedAt });
@Injectable()
export class AppointmentsService {
  constructor(private readonly repository: AppointmentsRepository, private readonly transactions: TransactionManagerService, private readonly events: CrmEventService, private readonly jobs: SchedulingJobsService, private readonly availability: AvailabilityRepository, private readonly services: ServicesRepository, private readonly lock: SchedulingLockService) {}
  async list(c: WorkspaceRequestContext, q: CrmListQueryDto) { const p = await this.repository.page(c.workspaceId, q); return { ...p, items: p.items.map(map) }; }
  async get(c: WorkspaceRequestContext, id: string) { return map(await this.repository.getActive(c.workspaceId, id)); }
  async create(c: WorkspaceRequestContext, dto: CreateAppointmentDto) {
    const start = parseInstant(dto.start); const end = parseInstant(dto.end); assertTimeZone(dto.timezone); assertRange(start, end);
    const value = await this.lock.run(c.workspaceId, dto.staffId, () => this.transactions.run(async (session) => {
      const duplicate = await this.repository.findByIdempotency(c.workspaceId, dto.idempotencyKey, session);
      if (duplicate) return duplicate;
      const [rule, service] = await Promise.all([this.availability.findForStaff(c.workspaceId, dto.staffId, session), this.services.getActive(c.workspaceId, dto.serviceId, session)]);
      if (rule) assertAvailable(rule, start, end);
      const before = rule?.bufferBeforeMinutes ?? service.bufferBeforeMinutes;
      const after = rule?.bufferAfterMinutes ?? service.bufferAfterMinutes;
      const conflictStart = new Date(start.valueOf() - before * 60_000);
      const conflictEnd = new Date(end.valueOf() + after * 60_000);
      if (await this.repository.findConflict(c.workspaceId, dto.staffId, conflictStart, conflictEnd, undefined, session)) throw new ConflictException('Staff member is unavailable for this time range');
      const created = await this.repository.createEntity(c.workspaceId, c.userId, { ...dto, startAt: start, endAt: end, bufferBeforeMinutes: before, bufferAfterMinutes: after, status: 'confirmed' }, session);
      await this.events.record({ workspaceId: c.workspaceId, actorId: c.userId, entityType: 'appointment', entityId: String(created._id), action: 'booked', session });
      return created;
    }));
    await this.jobs.reminders(c.workspaceId, String(value._id), value.reminders, value.startAt);
    return map(value);
  }
  async reschedule(c: WorkspaceRequestContext, id: string, dto: RescheduleAppointmentDto) {
    const start = parseInstant(dto.start); const end = parseInstant(dto.end); assertTimeZone(dto.timezone); assertRange(start, end);
    const currentForLock = await this.repository.getActive(c.workspaceId, id);
    const value = await this.lock.run(c.workspaceId, String(currentForLock.staffId), () => this.transactions.run(async (session) => {
      const current = await this.repository.getActive(c.workspaceId, id, session);
      const rule = await this.availability.findForStaff(c.workspaceId, String(current.staffId), session);
      if (rule) assertAvailable(rule, start, end);
      const conflictStart = new Date(start.valueOf() - current.bufferBeforeMinutes * 60_000);
      const conflictEnd = new Date(end.valueOf() + current.bufferAfterMinutes * 60_000);
      if (await this.repository.findConflict(c.workspaceId, String(current.staffId), conflictStart, conflictEnd, id, session)) throw new ConflictException('Staff member is unavailable for this time range');
      const changed = await this.repository.updateEntity(c.workspaceId, id, c.userId, dto.version, { startAt: start, endAt: end, timezone: dto.timezone, idempotencyKey: dto.idempotencyKey }, session);
      await this.events.record({ workspaceId: c.workspaceId, actorId: c.userId, entityType: 'appointment', entityId: id, action: 'rescheduled', session });
      return changed;
    }));
    await this.jobs.reminders(c.workspaceId, id, value.reminders, value.startAt);
    return map(value);
  }
  async cancel(c: WorkspaceRequestContext, id: string, dto: CancelAppointmentDto) {
    const value = await this.repository.updateEntity(c.workspaceId, id, c.userId, dto.version, { status: 'cancelled', cancellationReason: dto.reason });
    await this.events.record({ workspaceId: c.workspaceId, actorId: c.userId, entityType: 'appointment', entityId: id, action: 'cancelled' });
    return map(value);
  }
}
