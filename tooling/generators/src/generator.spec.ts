import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { generateFeature } from './generator.js';
import { validateModuleName } from './naming.js';

const roots: string[] = [];
async function fixture() { const root = await mkdtemp(path.join(tmpdir(), 'feature-generator-')); roots.push(root); await mkdir(path.join(root, 'apps/api/src/modules'), { recursive: true }); await mkdir(path.join(root, 'apps/web/src/features'), { recursive: true }); return root; }
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

describe('feature generator', () => {
  it.each<string>(['Contacts', '../escape', 'two words', ''])('rejects invalid name %j', (name) => expect(() => validateModuleName(name)).toThrow());
  it('generates tenant-aware backend and frontend templates', async () => {
    const root = await fixture();
    const result = await generateFeature({ moduleName: 'customer-segments', tenantOwned: true, crud: true, eventProducing: true, queueJobs: true, frontend: true, repositoryRoot: root });
    expect(result.files).toContain('apps/api/src/modules/customer-segments/customer-segments.module.ts');
    expect(result.files).toContain('apps/web/src/features/customer-segments/index.ts');
    expect(await readFile(path.join(root, 'apps/api/src/modules/customer-segments/schemas/customer-segment.schema.ts'), 'utf8')).toContain('workspaceId');
    expect(result.instructions.join(' ')).toContain('app.module.ts');
  });
  it('omits optional outputs when disabled', async () => {
    const root = await fixture();
    const result = await generateFeature({ moduleName: 'catalogs', tenantOwned: false, crud: false, eventProducing: false, queueJobs: false, frontend: false, repositoryRoot: root });
    expect(result.files.some((file) => file.includes('/events/'))).toBe(false);
    expect(result.files.some((file) => file.startsWith('apps/web/'))).toBe(false);
  });
  it('never overwrites an existing module or file', async () => {
    const root = await fixture(); const existing = path.join(root, 'apps/api/src/modules/orders'); await mkdir(existing, { recursive: true }); await writeFile(path.join(existing, 'keep.txt'), 'safe');
    await expect(generateFeature({ moduleName: 'orders', tenantOwned: true, crud: true, eventProducing: false, queueJobs: false, frontend: false, repositoryRoot: root })).rejects.toThrow('already exists');
    expect(await readFile(path.join(existing, 'keep.txt'), 'utf8')).toBe('safe');
  });
});
