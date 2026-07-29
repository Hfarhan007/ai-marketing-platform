import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';

export const hashContent = (value: string) => createHash('sha256').update(value).digest('hex');
@Injectable()
export class ChunkingService {
  readonly version = 'words-v1';
  normalize(value: string) {
    return value.normalize('NFKC').replace(/\r\n?/gu, '\n').replace(/[^\S\n]+/gu, ' ').replace(/\n{3,}/gu, '\n\n').trim();
  }
  chunk(value: string, size = 220, overlap = 30) {
    const words = this.normalize(value).split(/\s+/u).filter(Boolean);
    if (size < 20 || overlap < 0 || overlap >= size) throw new Error('Invalid chunking policy');
    const chunks: Array<{ ordinal: number; text: string; hash: string }> = [];
    for (let start = 0; start < words.length; start += size - overlap) {
      const text = words.slice(start, start + size).join(' ');
      if (text) chunks.push({ ordinal: chunks.length, text, hash: hashContent(text) });
      if (start + size >= words.length) break;
    }
    return chunks;
  }
}
