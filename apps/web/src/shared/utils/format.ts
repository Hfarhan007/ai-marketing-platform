export type DateInput = Date | number | string;

export function toDate(value: DateInput) {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) throw new RangeError('Invalid date.');
  return date;
}

export function formatDate(value: DateInput, locale = 'en', options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }) {
  return new Intl.DateTimeFormat(locale, options).format(toDate(value));
}
export function formatInTimeZone(value: DateInput, timeZone: string, locale = 'en', options: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', ...options, timeZone }).format(toDate(value));
}
export function isValidTimeZone(timeZone: string) {
  try { new Intl.DateTimeFormat('en', { timeZone }); return true; } catch { return false; }
}
export function formatNumber(value: number, locale = 'en', options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(locale, options).format(value);
}
export function formatCurrency(value: number, currency: string, locale = 'en', options?: Intl.NumberFormatOptions) {
  return formatNumber(value, locale, { currency, style: 'currency', ...options });
}
export function formatPercentage(value: number, locale = 'en', options?: Intl.NumberFormatOptions) {
  return formatNumber(value, locale, { maximumFractionDigits: 1, style: 'percent', ...options });
}
export function formatFileSize(bytes: number, locale = 'en') {
  if (!Number.isFinite(bytes) || bytes < 0) throw new RangeError('File size must be a finite non-negative number.');
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'] as const;
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${formatNumber(bytes / 1024 ** index, locale, { maximumFractionDigits: index ? 1 : 0 })} ${units[index]}`;
}
