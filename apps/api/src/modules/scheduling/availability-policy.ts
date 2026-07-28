import { BadRequestException } from '@nestjs/common';
import type { Availability } from '../availability/schemas/availability.schema.js';
import { zonedParts } from './time.js';

export function assertAvailable(rule: Availability, start: Date, end: Date, now = new Date()): void {
  if (start.valueOf() - now.valueOf() < rule.minimumNoticeMinutes * 60_000) throw new BadRequestException('Minimum booking notice is not met');
  if (start.valueOf() > now.valueOf() + rule.bookingHorizonDays * 86_400_000) throw new BadRequestException('Booking is beyond the allowed horizon');
  const localStart = zonedParts(start, rule.timezone);
  const localEnd = zonedParts(end, rule.timezone);
  if (localStart.date !== localEnd.date || rule.holidays.includes(localStart.date)) throw new BadRequestException('Requested time is unavailable');
  const override = rule.dateOverrides.find((item) => item.date === localStart.date);
  if (override?.available === false) throw new BadRequestException('Requested date is unavailable');
  const hours = rule.workingHours.find((item) => item.weekday === localStart.weekday && item.enabled !== false);
  const opening = Number(override?.startMinutes ?? hours?.startMinutes);
  const closing = Number(override?.endMinutes ?? hours?.endMinutes);
  if (!Number.isFinite(opening) || localStart.minutes < opening || localEnd.minutes > closing) throw new BadRequestException('Requested time is outside working hours');
  if (rule.breaks.some((item) => localStart.minutes < Number(item.endMinutes) && localEnd.minutes > Number(item.startMinutes))) throw new BadRequestException('Requested time overlaps a break');
}
