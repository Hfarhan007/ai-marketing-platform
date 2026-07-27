export function capitalize(value: string) {
  const trimmed = value.trim();
  return trimmed ? `${trimmed[0]?.toLocaleUpperCase()}${trimmed.slice(1)}` : '';
}
export function truncate(value: string, maxLength: number, suffix = '…') {
  if (maxLength < suffix.length) throw new RangeError('Maximum length must fit the suffix.');
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - suffix.length).trimEnd()}${suffix}`;
}
export function slugify(value: string) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
export function isValidHttpUrl(value: string, allowLocalhost = false) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    return allowLocalhost || (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1' && !url.hostname.endsWith('.local'));
  } catch { return false; }
}
