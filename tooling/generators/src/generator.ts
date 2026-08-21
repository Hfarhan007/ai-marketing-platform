import { access, mkdir, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { backendTemplates, frontendTemplates, type TemplateOptions } from './templates.js';
import { featureNames } from './naming.js';

export interface GenerateFeatureOptions {
  moduleName: string;
  tenantOwned: boolean;
  crud: boolean;
  eventProducing: boolean;
  queueJobs: boolean;
  frontend: boolean;
  repositoryRoot?: string;
}
export interface GenerationResult { files: string[]; instructions: string[]; }

async function exists(target: string): Promise<boolean> {
  try { await access(target, constants.F_OK); return true; } catch { return false; }
}

export async function generateFeature(input: GenerateFeatureOptions): Promise<GenerationResult> {
  const root = path.resolve(input.repositoryRoot ?? process.cwd());
  const names = featureNames(input.moduleName);
  const options: TemplateOptions = { names, tenantOwned: input.tenantOwned, crud: input.crud, eventProducing: input.eventProducing, queueJobs: input.queueJobs, frontend: input.frontend };
  const apiRoot = path.join(root, 'apps', 'api', 'src', 'modules', names.kebab);
  const webRoot = path.join(root, 'apps', 'web', 'src', 'features', names.kebab);
  if (await exists(apiRoot)) throw new Error(`Backend module already exists: ${path.relative(root, apiRoot)}`);
  if (input.frontend && await exists(webRoot)) throw new Error(`Frontend feature already exists: ${path.relative(root, webRoot)}`);
  const planned = [
    ...Object.entries(backendTemplates(options)).map(([relative, content]) => ({ target: path.join(apiRoot, relative), content })),
    ...Object.entries(frontendTemplates(options)).map(([relative, content]) => ({ target: path.join(webRoot, relative), content })),
  ];
  for (const { target } of planned) if (await exists(target)) throw new Error(`Refusing to overwrite existing file: ${path.relative(root, target)}`);
  for (const { target, content } of planned) { await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, content, { encoding: 'utf8', flag: 'wx' }); }
  const instructions = [
    `Import ${names.pascal}Module from './modules/${names.kebab}/${names.kebab}.module.js' and add it to imports in apps/api/src/app.module.ts.`,
    ...(input.frontend ? [`Add ${names.pascal}Page from '@/features/${names.kebab}' to the workspace routes in apps/web/src/app/router/router.tsx.`] : []),
    ...(input.queueJobs ? [`Register the ${names.kebab} queue and connect ${names.pascal}Processor using the queue conventions in apps/api/src/queues.`] : []),
    'Review permission names and add @RequirePermissions decorators before exposing the controller.',
    'Run pnpm lint, pnpm type-check, pnpm test, and pnpm build.',
  ];
  return { files: planned.map(({ target }) => path.relative(root, target).replaceAll('\\', '/')), instructions };
}
