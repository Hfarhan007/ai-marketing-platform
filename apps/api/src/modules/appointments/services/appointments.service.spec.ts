import { ConflictException } from '@nestjs/common';
import { Types } from 'mongoose';
import { describe, expect, it, vi } from 'vitest';
import { AppointmentsService } from './appointments.service.js';
const oid = () => new Types.ObjectId();
const context = {
  workspaceId: oid().toHexString(),
  userId: oid().toHexString(),
  membershipId: oid().toHexString(),
  roleIds: [],
};
const dto = {
  customerId: oid().toHexString(),
  staffId: oid().toHexString(),
  serviceId: oid().toHexString(),
  start: '2026-08-03T10:00:00Z',
  end: '2026-08-03T11:00:00Z',
  timezone: 'UTC',
  location: '',
  meetingLink: '',
  reminders: [30],
  notes: '',
  idempotencyKey: 'request-1',
};
const transaction = { run: <T>(fn: (session: never) => Promise<T>) => fn({} as never) };
const events = { record: vi.fn() };
const jobs = { reminders: vi.fn() };
const lock = { run: <T>(_workspaceId: string, _staffId: string, fn: () => Promise<T>) => fn() };
const fields = { validateValues: vi.fn().mockResolvedValue({}) };
const serviceRecord = { bufferBeforeMinutes: 15, bufferAfterMinutes: 10 };
describe('AppointmentsService', () => {
  it('returns the original reservation for a duplicate idempotency key', async () => {
    const existing = {
      _id: oid(),
      ...dto,
      startAt: new Date(dto.start),
      endAt: new Date(dto.end),
      status: 'confirmed',
      version: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      cancellationReason: null,
      noShow: false,
    };
    const repo = { findByIdempotency: vi.fn().mockResolvedValue(existing) };
    const service = new AppointmentsService(
      repo as never,
      transaction as never,
      events as never,
      jobs as never,
      { findForStaff: vi.fn() } as never,
      { getActive: vi.fn() } as never,
      lock as never,
      fields as never,
    );
    const value = await service.create(context, dto);
    expect(value.id).toBe(String(existing._id));
    expect(events.record).not.toHaveBeenCalled();
  });
  it('rejects conflicting staff reservations including buffers', async () => {
    const repo = {
      findByIdempotency: vi.fn().mockResolvedValue(null),
      findConflict: vi.fn().mockResolvedValue({ _id: oid() }),
    };
    const service = new AppointmentsService(
      repo as never,
      transaction as never,
      events as never,
      jobs as never,
      { findForStaff: vi.fn().mockResolvedValue(null) } as never,
      { getActive: vi.fn().mockResolvedValue(serviceRecord) } as never,
      lock as never,
      fields as never,
    );
    await expect(service.create(context, dto)).rejects.toBeInstanceOf(ConflictException);
    expect(repo.findConflict).toHaveBeenCalledWith(
      context.workspaceId,
      dto.staffId,
      new Date('2026-08-03T09:45:00Z'),
      new Date('2026-08-03T11:10:00Z'),
      undefined,
      expect.anything(),
    );
  });
  it('cancels with an optimistic version and audit event', async () => {
    const changed = {
      _id: oid(),
      ...dto,
      startAt: new Date(dto.start),
      endAt: new Date(dto.end),
      status: 'cancelled',
      version: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
      cancellationReason: 'customer',
      noShow: false,
    };
    const repo = { updateEntity: vi.fn().mockResolvedValue(changed) };
    const service = new AppointmentsService(
      repo as never,
      transaction as never,
      events as never,
      jobs as never,
      {} as never,
      {} as never,
      lock as never,
      fields as never,
    );
    await service.cancel(context, String(changed._id), { version: 1, reason: 'customer' });
    expect(repo.updateEntity).toHaveBeenCalledWith(
      context.workspaceId,
      String(changed._id),
      context.userId,
      1,
      { status: 'cancelled', cancellationReason: 'customer' },
    );
    expect(events.record).toHaveBeenCalled();
  });
  it('reschedules while excluding the current appointment from conflict checks', async () => {
    const current = {
      _id: oid(),
      ...dto,
      startAt: new Date(dto.start),
      endAt: new Date(dto.end),
      status: 'confirmed',
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      cancellationReason: null,
      noShow: false,
      bufferBeforeMinutes: 15,
      bufferAfterMinutes: 10,
    };
    const changed = {
      ...current,
      startAt: new Date('2026-08-03T12:00:00Z'),
      endAt: new Date('2026-08-03T13:00:00Z'),
      version: 2,
    };
    const repo = {
      getActive: vi.fn().mockResolvedValue(current),
      findConflict: vi.fn().mockResolvedValue(null),
      updateEntity: vi.fn().mockResolvedValue(changed),
    };
    const service = new AppointmentsService(
      repo as never,
      transaction as never,
      events as never,
      jobs as never,
      { findForStaff: vi.fn().mockResolvedValue(null) } as never,
      {} as never,
      lock as never,
      fields as never,
    );
    await service.reschedule(context, String(current._id), {
      start: '2026-08-03T12:00:00Z',
      end: '2026-08-03T13:00:00Z',
      timezone: 'UTC',
      version: 1,
      idempotencyKey: 'reschedule-1',
    });
    expect(repo.findConflict.mock.calls[0]?.[4]).toBe(String(current._id));
    expect(jobs.reminders).toHaveBeenCalled();
  });
});
