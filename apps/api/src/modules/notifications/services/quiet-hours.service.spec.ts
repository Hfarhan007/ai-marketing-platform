import { describe, expect, it } from 'vitest';
import { QuietHoursService } from './quiet-hours.service.js';
describe('QuietHoursService', () => {
  const service = new QuietHoursService();
  it('defers delivery through overnight quiet hours in the recipient timezone', () => {
    const now = new Date('2026-07-28T20:30:00.000Z'); // 01:30 in Karachi
    const result = service.evaluate(now, 'Asia/Karachi', { start: '22:00', end: '07:00' });
    expect(result.quiet).toBe(true);
    expect(result.deliverAt).toEqual(new Date('2026-07-29T02:00:00.000Z'));
  });
  it('does not defer outside quiet hours', () => {
    const now = new Date('2026-07-28T10:00:00.000Z');
    expect(service.evaluate(now, 'UTC', { start: '22:00', end: '07:00' })).toEqual({
      quiet: false,
      deliverAt: now,
    });
  });
});
