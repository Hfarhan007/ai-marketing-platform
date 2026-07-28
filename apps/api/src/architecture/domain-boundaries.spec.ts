import { readFileSync, readdirSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DOMAIN_MAP, DOMAIN_NAMES, type DomainName } from '../domains/domain-map.js';

const sourceRoot = resolve(process.cwd(), 'src');
function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory()
      ? files(path)
      : extname(path) === '.ts' && !path.endsWith('.spec.ts')
        ? [path]
        : [];
  });
}
const sourceFiles = files(sourceRoot);
const moduleDomain = new Map<string, DomainName>(
  DOMAIN_NAMES.flatMap((domain) =>
    DOMAIN_MAP[domain].modules.map((module) => [module, domain] as const),
  ),
);

describe('backend domain boundaries', () => {
  it('defines every required architectural role for every domain', () => {
    expect(DOMAIN_NAMES).toHaveLength(14);
    for (const name of DOMAIN_NAMES)
      for (const [role, entries] of Object.entries(DOMAIN_MAP[name]))
        expect(entries, `${name}.${role}`).not.toHaveLength(0);
  });

  it('keeps domain contracts independent from NestJS and Mongoose', () => {
    for (const path of sourceFiles.filter((path) =>
      path.replaceAll('\\', '/').includes('/src/domains/'),
    )) {
      const content = readFileSync(path, 'utf8');
      expect(content, path).not.toMatch(/from ['"]@nestjs\//u);
      expect(content, path).not.toMatch(/from ['"]mongoose['"]/u);
    }
  });

  it('does not inject Mongoose models outside repository infrastructure', () => {
    const persistenceAdapters = new Set([
      'database/migrations/migration-runner.service.ts',
      'events/inbox.service.ts',
      'events/outbox.service.ts',
      'modules/crm/crm-event.service.ts',
      'modules/permissions/services/privileged-audit.service.ts',
    ]);
    const offenders = sourceFiles
      .filter((path) => readFileSync(path, 'utf8').includes('@InjectModel'))
      .filter((path) => !path.replaceAll('\\', '/').includes('/repositories/'))
      .filter((path) => !persistenceAdapters.has(relative(sourceRoot, path).replaceAll('\\', '/')));
    expect(offenders.map((path) => relative(sourceRoot, path))).toEqual([]);
  });

  it('keeps controllers away from persistence schemas and repositories', () => {
    const offenders = sourceFiles
      .filter((path) => path.includes(`${join('controllers', '')}`))
      .filter((path) =>
        /from ['"][^'"]*(?:repositories|schemas)\//u.test(readFileSync(path, 'utf8')),
      );
    expect(offenders.map((path) => relative(sourceRoot, path))).toEqual([]);
  });

  it('prevents direct cross-domain repository and schema imports', () => {
    const offenders: string[] = [];
    for (const path of sourceFiles) {
      const normalized = path.replaceAll('\\', '/'),
        match = normalized.match(/\/modules\/([^/]+)\//u);
      if (!match) continue;
      const sourceDomain = moduleDomain.get(match[1] ?? '');
      if (!sourceDomain) continue;
      const content = readFileSync(path, 'utf8');
      for (const imported of content.matchAll(
        /from ['"][^'"]*modules\/([^/]+)\/(?:repositories|schemas)\//gu,
      )) {
        const targetDomain = moduleDomain.get(imported[1] ?? '');
        if (targetDomain && targetDomain !== sourceDomain)
          offenders.push(`${relative(sourceRoot, path)} -> ${imported[1]}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
