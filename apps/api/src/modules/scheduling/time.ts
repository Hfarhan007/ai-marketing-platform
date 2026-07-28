import { BadRequestException } from '@nestjs/common';

const ISO_WITH_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;

export function assertTimeZone(timeZone: string): void {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
  } catch {
    throw new BadRequestException('Invalid IANA timezone');
  }
}

export function parseInstant(value: string): Date {
  if (!ISO_WITH_OFFSET.test(value)) throw new BadRequestException('Timestamp must be ISO-8601 with an explicit offset');
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) throw new BadRequestException('Invalid timestamp');
  return date;
}

export function assertRange(start: Date, end: Date): void {
  if (end <= start) throw new BadRequestException('End must be after start');
}

export function zonedParts(date: Date, timeZone: string): { weekday: number; minutes: number; date: string } {
  assertTimeZone(timeZone);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return { weekday, minutes: Number(get('hour')) * 60 + Number(get('minute')), date: `${get('year')}-${get('month')}-${get('day')}` };
}
