import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import type { Availability } from '../availability/schemas/availability.schema.js';
import { assertAvailable } from './availability-policy.js';
import { parseInstant, zonedParts } from './time.js';

const rule = (overrides: Partial<Availability> = {}) => ({
  timezone: 'America/New_York',
  minimumNoticeMinutes: 0,
  bookingHorizonDays: 90,
  holidays: [],
  dateOverrides: [],
  breaks: [],
  workingHours: [{ weekday: 0, startMinutes: 0, endMinutes: 1440, enabled: true }],
  ...overrides,
}) as Availability;

describe('timezone-safe scheduling', () => {
  it('requires an explicit UTC offset', () => {
    expect(() => parseInstant('2026-08-01T10:00:00')).toThrow(BadRequestException);
    expect(parseInstant('2026-08-01T10:00:00+05:00').toISOString()).toBe('2026-08-01T05:00:00.000Z');
  });
  it('preserves local clock interpretation across the spring DST boundary', () => {
    const before = zonedParts(new Date('2026-03-08T06:30:00Z'), 'America/New_York');
    const after = zonedParts(new Date('2026-03-08T07:30:00Z'), 'America/New_York');
    expect(before.minutes).toBe(90);
    expect(after.minutes).toBe(210);
  });
  it('rejects a booking overlapping a configured break', () => {
    const availability = rule({ breaks: [{ startMinutes: 120, endMinutes: 180 }] });
    expect(() => assertAvailable(availability, new Date('2026-03-08T06:30:00Z'), new Date('2026-03-08T07:30:00Z'), new Date('2026-01-01T00:00:00Z'))).toThrow('overlaps a break');
  });
  it('enforces minimum notice and booking horizon', () => {
    const availability = rule({ minimumNoticeMinutes: 120, bookingHorizonDays: 30 });
    expect(() => assertAvailable(availability, new Date('2026-03-08T06:30:00Z'), new Date('2026-03-08T07:30:00Z'), new Date('2026-03-08T05:30:00Z'))).toThrow('Minimum booking notice');
  });
});
