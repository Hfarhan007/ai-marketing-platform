import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { generateFeature } from './generator.js';

type Answers = Record<string, string>;
const parseBoolean = (value: string, label: string): boolean => {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'yes' || normalized === 'true' || normalized === 'y') return true;
  if (normalized === 'no' || normalized === 'false' || normalized === 'n') return false;
  throw new Error(`${label} must be yes or no`);
};
const flags = (): Answers => {
  const result: Answers = {};
  for (let index = 2; index < process.argv.length; index += 2) {
    const key = process.argv[index]; const value = process.argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) throw new Error(`Invalid argument near ${key ?? 'end of command'}`);
    result[key.slice(2)] = value;
  }
  return result;
};

async function main() {
  const provided = flags();
  const prompt = createInterface({ input: stdin, output: stdout });
  try {
    const ask = async (key: string, question: string) => provided[key] ?? prompt.question(question);
    const result = await generateFeature({
      moduleName: await ask('name', 'Module name (kebab-case): '),
      tenantOwned: parseBoolean(await ask('tenant-owned', 'Tenant-owned? (yes/no): '), 'tenant-owned'),
      crud: parseBoolean(await ask('crud', 'Generate CRUD? (yes/no): '), 'crud'),
      eventProducing: parseBoolean(await ask('events', 'Produce domain events? (yes/no): '), 'events'),
      queueJobs: parseBoolean(await ask('queue', 'Generate queue jobs? (yes/no): '), 'queue'),
      frontend: parseBoolean(await ask('frontend', 'Generate frontend feature? (yes/no): '), 'frontend'),
    });
    stdout.write(`\nCreated ${result.files.length} files:\n${result.files.map((file) => `  - ${file}`).join('\n')}\n\nRegistration instructions:\n${result.instructions.map((item, index) => `  ${index + 1}. ${item}`).join('\n')}\n`);
  } finally { prompt.close(); }
}

main().catch((error: unknown) => { process.stderr.write(`${error instanceof Error ? error.message : 'Feature generation failed'}\n`); process.exitCode = 1; });
