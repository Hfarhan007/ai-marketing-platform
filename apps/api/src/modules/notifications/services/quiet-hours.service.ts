import { Injectable } from '@nestjs/common';
import { zonedParts } from '../../scheduling/time.js';
@Injectable()
export class QuietHoursService {
  evaluate(now: Date, timezone: string, quiet: { start: string; end: string } | null) {
    if (!quiet) return { quiet: false, deliverAt: now };
    const start = this.minutes(quiet.start),
      end = this.minutes(quiet.end);
    const local = zonedParts(now, timezone).minutes;
    const active = start < end ? local >= start && local < end : local >= start || local < end;
    if (!active) return { quiet: false, deliverAt: now };
    const remaining = start < end || local < end ? end - local : 1440 - local + end;
    return { quiet: true, deliverAt: new Date(now.valueOf() + remaining * 60_000) };
  }
  private minutes(value: string) {
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/u.test(value))
      throw new Error('NOTIFICATION_QUIET_HOURS_INVALID');
    const [hour, minute] = value.split(':').map(Number);
    return hour! * 60 + minute!;
  }
}
