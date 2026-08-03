import { readFileSync, readdirSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? files(path) : extname(path) === '.ts' ? [path] : [];
  });
}

describe('AI provider access boundary', () => {
  it('forbids AI provider SDK imports outside AI provider adapters', () => {
    const source = resolve(process.cwd(), 'src');
    const sdk = /from ['"](?:openai|@google\/generative-ai|@google\/genai|groq-sdk|openrouter(?:\/[^'"]*)?)['"]/u;
    const offenders = files(source)
      .filter((path) => sdk.test(readFileSync(path, 'utf8')))
      .filter((path) => !path.replaceAll('\\', '/').includes('/modules/ai/providers/'));
    expect(offenders.map((path) => path.replace(source, ''))).toEqual([]);
  });
  it('forbids concrete provider adapter imports from feature modules', () => {
    const source = resolve(process.cwd(), 'src');
    const concrete = /from ['"][^'"]*ai\/providers\/(?:openai|gemini|groq|openrouter|ollama)\.provider/iu;
    const offenders = files(source)
      .filter((path) => concrete.test(readFileSync(path, 'utf8')))
      .filter((path) => !path.replaceAll('\\', '/').includes('/modules/ai/providers/'))
      .filter((path) => !path.endsWith('modules\\ai\\ai.module.ts') && !path.endsWith('modules/ai/ai.module.ts'))
      .filter((path) => !path.endsWith('.spec.ts'));
    expect(offenders.map((path) => path.replace(source, ''))).toEqual([]);
  });
});
