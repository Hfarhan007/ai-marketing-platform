import { describe, expect, it } from 'vitest';
import {
  capitalize, chunk, compactObject, extensionFromName, filterByQuery, formatCurrency,
  formatDate, formatFileSize, formatInTimeZone, formatNumber, formatPercentage, groupBy,
  isValidHttpUrl, isValidTimeZone, matchesMimeType, normalizePagination, omit, paginate,
  paginationRange, pick, searchParamsToObject, slugify, sortBy, toDate, toSearchParams,
  truncate, unique, updateSearchParams, validateFile,
} from './index';

describe('format helpers', () => {
  it('formats dates and validates time zones', () => {
    expect(toDate('2026-07-23').getUTCFullYear()).toBe(2026);
    expect(formatDate('2026-07-23', 'en-US', { timeZone: 'UTC', year: 'numeric' })).toBe('2026');
    expect(formatInTimeZone('2026-07-23T12:00:00Z', 'UTC', 'en-US')).toContain('2026');
    expect(isValidTimeZone('Asia/Karachi')).toBe(true);
    expect(isValidTimeZone('Invalid/Zone')).toBe(false);
  });
  it('formats numbers, money, percentages, and file sizes', () => {
    expect(formatNumber(1234, 'en-US')).toBe('1,234');
    expect(formatCurrency(12, 'USD', 'en-US')).toContain('$12');
    expect(formatPercentage(0.125, 'en-US')).toBe('12.5%');
    expect(formatFileSize(1024, 'en-US')).toBe('1 KB');
    expect(() => formatFileSize(-1)).toThrow(RangeError);
  });
});

describe('string and URL helpers', () => {
  it('normalizes common display strings and slugs', () => {
    expect(capitalize(' hello')).toBe('Hello');
    expect(truncate('long sentence', 8)).toBe('long se…');
    expect(slugify('Crème Brûlée!')).toBe('creme-brulee');
  });
  it('accepts public HTTP URLs and rejects unsafe/local schemes', () => {
    expect(isValidHttpUrl('https://example.com/path')).toBe(true);
    expect(isValidHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isValidHttpUrl('http://localhost:3000')).toBe(false);
  });
});

describe('collection helpers', () => {
  const records = [{ id: 2, name: 'Beta', type: 'b' }, { id: 1, name: 'Alpha', type: 'a' }, { id: 3, name: 'Another', type: 'a' }];
  it('handles arrays and grouping immutably', () => {
    expect(unique([1, 1, 2])).toEqual([1, 2]);
    expect(chunk([1, 2, 3], 2)).toEqual([[1, 2], [3]]);
    expect(groupBy(records, (item) => item.type).a).toHaveLength(2);
    expect(sortBy(records, (item) => item.id).map((item) => item.id)).toEqual([1, 2, 3]);
    expect(filterByQuery(records, 'alpha', (item) => [item.name])).toHaveLength(1);
  });
  it('selects, omits, and compacts object properties', () => {
    expect(pick(records[0]!, ['id'])).toEqual({ id: 2 });
    expect(omit(records[0]!, ['type'])).toEqual({ id: 2, name: 'Beta' });
    expect(compactObject({ a: 1, b: '', c: null })).toEqual({ a: 1 });
  });
});

describe('file helpers', () => {
  it('matches MIME patterns and validates file constraints', () => {
    expect(matchesMimeType('image/png', 'image/*')).toBe(true);
    expect(extensionFromName('report.Final.PDF')).toBe('pdf');
    expect(validateFile({ name: 'x.png', size: 100, type: 'image/png' }, { allowedMimeTypes: ['image/*'], maxBytes: 200 })).toEqual({ errors: [], valid: true });
    expect(validateFile({ name: 'x.exe', size: 300, type: 'application/octet-stream' }, { allowedMimeTypes: ['image/*'], maxBytes: 200 }).errors).toHaveLength(2);
  });
});

describe('pagination and query parameters', () => {
  it('normalizes and slices pages', () => {
    expect(normalizePagination({ page: -1, pageSize: 500 }, 100)).toEqual({ page: 1, pageSize: 100 });
    expect(paginate([1, 2, 3, 4], { page: 2, pageSize: 2 }).items).toEqual([3, 4]);
    expect(paginationRange(5, 10)).toEqual([4, 5, 6]);
  });
  it('serializes, parses, and updates repeated query parameters', () => {
    const params = toSearchParams({ page: 2, tags: ['a', 'b'], empty: null });
    expect(params.toString()).toBe('page=2&tags=a&tags=b');
    expect(searchParamsToObject(params)).toEqual({ page: '2', tags: ['a', 'b'] });
    expect(updateSearchParams(params, { tags: ['c', 'd'], page: undefined }).toString()).toBe('tags=c&tags=d');
  });
});
