import type { FileValidationOptions, FileValidationResult } from '@/shared/types';

export const mimeTypes = {
  csv: 'text/csv', gif: 'image/gif', jpeg: 'image/jpeg', json: 'application/json',
  pdf: 'application/pdf', png: 'image/png', svg: 'image/svg+xml', webp: 'image/webp',
} as const;

export function matchesMimeType(actual: string, allowed: string) {
  return allowed.endsWith('/*') ? actual.startsWith(allowed.slice(0, -1)) : actual === allowed;
}
export function validateFile(file: Pick<File, 'name' | 'size' | 'type'>, options: FileValidationOptions = {}): FileValidationResult {
  const errors: string[] = [];
  if (options.minBytes !== undefined && file.size < options.minBytes) errors.push(`File must be at least ${options.minBytes} bytes.`);
  if (options.maxBytes !== undefined && file.size > options.maxBytes) errors.push(`File must not exceed ${options.maxBytes} bytes.`);
  if (options.allowedMimeTypes?.length && !options.allowedMimeTypes.some((allowed) => matchesMimeType(file.type, allowed))) errors.push(`File type "${file.type || 'unknown'}" is not allowed.`);
  return { errors, valid: errors.length === 0 };
}
export function extensionFromName(name: string) {
  const match = /\.([^.]+)$/.exec(name.trim());
  return match?.[1]?.toLocaleLowerCase() ?? '';
}
