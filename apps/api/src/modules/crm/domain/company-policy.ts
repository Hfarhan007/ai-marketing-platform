export class CompanyPolicy {
  normalizeDomain(value: string) {
    return (
      value
        .trim()
        .toLocaleLowerCase('en-US')
        .replace(/^https?:\/\//u, '')
        .replace(/^www\./u, '')
        .split('/')[0] ?? ''
    );
  }
  assertParent(companyId: string, parentId?: string | null, ancestorIds: readonly string[] = []) {
    if (!parentId) return;
    if (companyId === parentId || ancestorIds.includes(companyId))
      throw new Error('COMPANY_RELATIONSHIP_CYCLE');
  }
  assertMutable(archived: boolean, operation: 'restore' | 'read' | 'update' | 'relate') {
    if (archived && operation !== 'restore' && operation !== 'read')
      throw new Error('ARCHIVED_COMPANY_IS_IMMUTABLE');
  }
  duplicateKey(name: string, domain: string) {
    const normalized = this.normalizeDomain(domain);
    return normalized ? `domain:${normalized}` : `name:${name.trim().toLocaleLowerCase('en-US')}`;
  }
}
