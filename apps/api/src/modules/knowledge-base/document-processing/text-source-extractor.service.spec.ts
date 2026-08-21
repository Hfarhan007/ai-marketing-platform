import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { TextSourceExtractorService } from './text-source-extractor.service.js';

describe('text source extraction', () => {
  const extractor = new TextSourceExtractorService();
  it('extracts UTF-8 TXT and Markdown uploads deterministically', () => {
    for (const [filename, mimeType] of [['guide.txt', 'text/plain'], ['guide.md', 'text/markdown']] as const) {
      expect(extractor.extract({ sourceType: 'uploaded_file', filename, mimeType, contentBase64: Buffer.from('# Guide\nSafe text').toString('base64') })).toMatchObject({ text: '# Guide\nSafe text', sourceReference: filename });
    }
  });
  it('rejects binary and unsupported uploads', () => {
    expect(() => extractor.extract({ sourceType: 'uploaded_file', filename: 'x.pdf', mimeType: 'application/pdf', contentBase64: 'eA==' })).toThrow(BadRequestException);
    expect(() => extractor.extract({ sourceType: 'uploaded_file', filename: 'x.txt', mimeType: 'text/plain', contentBase64: Buffer.from('a\0b').toString('base64') })).toThrow('binary');
  });
});
