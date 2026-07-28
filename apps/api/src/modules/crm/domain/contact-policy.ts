export interface IdentityPoint {
  value: string;
  normalized?: string;
  label?: string;
  primary?: boolean;
}
export class ContactIdentityPolicy {
  normalizeEmail(value: string) {
    return value.trim().normalize('NFKC').toLocaleLowerCase('en-US');
  }
  normalizePhone(value: string) {
    const valueOnly = value.trim().replace(/[^\d+]/gu, '');
    const normalized = valueOnly.startsWith('+')
      ? `+${valueOnly.slice(1).replace(/\D/gu, '')}`
      : valueOnly.replace(/\D/gu, '');
    if (normalized.replace(/\D/gu, '').length < 7) throw new Error('INVALID_PHONE_IDENTITY');
    return normalized;
  }
  prepare(points: IdentityPoint[], kind: 'email' | 'phone') {
    const seen = new Set<string>();
    const prepared = points.map((point) => {
      const normalized =
        kind === 'email' ? this.normalizeEmail(point.value) : this.normalizePhone(point.value);
      if (seen.has(normalized)) throw new Error('DUPLICATE_CONTACT_IDENTITY');
      seen.add(normalized);
      return { ...point, normalized, primary: Boolean(point.primary) };
    });
    if (prepared.length && !prepared.some((point) => point.primary)) prepared[0]!.primary = true;
    if (prepared.filter((point) => point.primary).length !== Math.min(1, prepared.length))
      throw new Error('EXACTLY_ONE_PRIMARY_IDENTITY_REQUIRED');
    return prepared;
  }
  merge(target: IdentityPoint[], source: IdentityPoint[], kind: 'email' | 'phone') {
    const values = new Map<string, IdentityPoint>();
    for (const point of [...target, ...source]) {
      const normalized =
        kind === 'email' ? this.normalizeEmail(point.value) : this.normalizePhone(point.value);
      if (!values.has(normalized)) values.set(normalized, { ...point, normalized, primary: false });
    }
    const result = [...values.values()];
    const preferred = [...target, ...source].find((point) => point.primary);
    const primary =
      preferred &&
      (kind === 'email'
        ? this.normalizeEmail(preferred.value)
        : this.normalizePhone(preferred.value));
    for (const point of result) point.primary = point.normalized === primary;
    if (result.length && !result.some((point) => point.primary)) result[0]!.primary = true;
    return result;
  }
  quality(input: {
    displayName: string;
    emails: IdentityPoint[];
    phones: IdentityPoint[];
    ownerId?: unknown;
    companyIds?: unknown[];
    consent?: Record<string, unknown>;
  }) {
    let score = input.displayName.trim() ? 25 : 0;
    if (input.emails.length) score += 20;
    if (input.phones.length) score += 15;
    if (input.ownerId) score += 15;
    if (input.companyIds?.length) score += 15;
    if (input.consent && Object.keys(input.consent).length) score += 10;
    return score;
  }
}
export function preserveConsent(
  target: Record<string, string | boolean>,
  source: Record<string, string | boolean>,
) {
  const result = { ...source, ...target };
  for (const key of new Set([...Object.keys(source), ...Object.keys(target)])) {
    if (source[key] === false || target[key] === false) result[key] = false;
    else if (source[key] === true || target[key] === true) result[key] = true;
  }
  return result;
}
