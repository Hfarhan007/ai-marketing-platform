import { BadRequestException } from '@nestjs/common';
import { Readable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { StreamParserService } from './stream-parser.service.js';
const parser = new StreamParserService();
async function collect(stream: AsyncGenerator<unknown>) {
  const rows: unknown[] = [];
  for await (const row of stream) rows.push(row);
  return rows;
}
describe('StreamParserService', () => {
  it('streams quoted CSV values across chunks', async () => {
    const rows = await collect(
      parser.parse('csv', Readable.from(['name,email\n"Ada,', ' Lovelace",ada@example.com\n'])),
    );
    expect(rows).toEqual([
      { rowNumber: 2, values: { name: 'Ada, Lovelace', email: 'ada@example.com' } },
    ]);
  });
  it('rejects malformed CSV without buffering the whole file', async () => {
    await expect(
      collect(parser.parse('csv', Readable.from(['name,email\n"unterminated,value']))),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
  it('rejects malformed JSON rows', async () => {
    await expect(
      collect(parser.parse('json', Readable.from(['{"name":"valid"}\n{"broken":}\n']))),
    ).rejects.toThrow('IMPORT_JSON_MALFORMED');
  });
});
