import { deflateRawSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { SecureTextExtractor } from './secure-text-extractor.js';
const limits = {
  maxFileBytes: 1_000_000,
  maxExpandedBytes: 2_000_000,
  maxCompressionRatio: 100,
  maxEntries: 100,
};
function zip(entries: Array<{ name: string; content: string; declaredSize?: number }>) {
  return Buffer.concat(
    entries.map((entry) => {
      const name = Buffer.from(entry.name),
        value = Buffer.from(entry.content),
        compressed = deflateRawSync(value),
        header = Buffer.alloc(30);
      header.writeUInt32LE(0x04034b50, 0);
      header.writeUInt16LE(20, 4);
      header.writeUInt16LE(8, 8);
      header.writeUInt32LE(compressed.length, 18);
      header.writeUInt32LE(entry.declaredSize ?? value.length, 22);
      header.writeUInt16LE(name.length, 26);
      return Buffer.concat([header, name, compressed]);
    }),
  );
}
describe('secure text extraction', () => {
  const extractor = new SecureTextExtractor();
  it('normalizes markdown while preserving section paths and source offsets', () => {
    const result = extractor.extract(
      Buffer.from('# Intro\r\nHello world\r\n## Detail\r\nValue'),
      '.md',
      'text/markdown',
      limits,
    );
    expect(result.text).toContain('Hello world');
    expect(result.blocks[1]?.sectionPath).toEqual(['Intro']);
    expect(result.blocks[1]?.sourceStart).toBeTypeOf('number');
    expect(result.blocks[1]?.sourceEnd).toBeTypeOf('number');
    expect(result.blocks[3]?.sectionPath).toEqual(['Intro', 'Detail']);
    expect(result.toolVersion).toMatch(/^secure-text-extractor\//u);
    expect(result.contentHash).toHaveLength(64);
  });
  it('preserves PDF page numbers and rejects embedded JavaScript', () => {
    const safe = Buffer.from('%PDF-1.7 /Type /Page (First) Tj /Type /Page (Second) Tj');
    expect(
      extractor
        .extract(safe, '.pdf', 'application/pdf', limits)
        .blocks.map((block) => block.pageNumber),
    ).toEqual([1, 2]);
    expect(() =>
      extractor.extract(
        Buffer.from('%PDF-1.7 /JavaScript (evil)'),
        '.pdf',
        'application/pdf',
        limits,
      ),
    ).toThrow('embedded code');
  });
  it('removes HTML executable content and boilerplate while retaining offsets', () => {
    const result = extractor.extract(
      Buffer.from(
        '<nav>menu</nav><h1>Title</h1><script>alert(1)</script><p>Body</p><footer>legal</footer>',
      ),
      '.html',
      'text/html',
      limits,
    );
    expect(result.text).toContain('Title');
    expect(result.text).toContain('Body');
    expect(result.text).not.toMatch(/alert|menu|legal/u);
    expect(result.blocks[0]?.sourceStart).toBeTypeOf('number');
  });
  it('extracts DOCX paragraphs without executing package content', () => {
    const fixture = zip([
        {
          name: 'word/document.xml',
          content: '<w:document><w:p><w:t>Hello</w:t><w:t>Office</w:t></w:p></w:document>',
        },
        { name: 'docProps/core.xml', content: '<dc:title>Fixture</dc:title>' },
      ]),
      result = extractor.extract(
        fixture,
        '.docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        limits,
      );
    expect(result.text).toBe('Hello Office');
    expect(result.metadata).toMatchObject({ entryCount: 2 });
  });
  it.each([
    [
      'macro package',
      zip([
        { name: 'word/document.xml', content: '<w:p><w:t>Safe</w:t></w:p>' },
        { name: 'word/vbaProject.bin', content: 'macro' },
      ]),
      'Macros',
    ],
    ['archive traversal', zip([{ name: '../escape.xml', content: 'bad' }]), 'Unsafe archive path'],
    [
      'archive bomb',
      zip([{ name: 'word/document.xml', content: 'tiny', declaredSize: 1_000_000 }]),
      'Archive bomb',
    ],
  ])('rejects malicious-file fixture: %s', (_name, fixture, message) => {
    expect(() =>
      extractor.extract(
        fixture,
        '.docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        limits,
      ),
    ).toThrow(message);
  });
  it('rejects malformed JSON and unsupported executable formats', () => {
    expect(() =>
      extractor.extract(Buffer.from('{bad'), '.json', 'application/json', limits),
    ).toThrow('Invalid JSON');
    expect(() =>
      extractor.extract(Buffer.from('#!/bin/sh'), '.sh', 'application/x-sh', limits),
    ).toThrow('not supported');
  });
});
