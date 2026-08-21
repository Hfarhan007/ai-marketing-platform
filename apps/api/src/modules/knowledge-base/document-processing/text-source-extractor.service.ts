import { BadRequestException, Injectable } from '@nestjs/common';
import { extname } from 'node:path';

export type TextSourceInput =
  | { sourceType: 'manual_text'; text: string }
  | { sourceType: 'uploaded_file'; filename: string; mimeType: string; contentBase64: string };

@Injectable()
export class TextSourceExtractorService {
  extract(input: TextSourceInput) {
    if (input.sourceType === 'manual_text') {
      if (!input.text.trim()) throw new BadRequestException('Manual text is empty');
      return { text: input.text, mimeType: 'text/plain', sourceReference: 'manual' };
    }
    const extension = extname(input.filename).toLocaleLowerCase();
    if (!['.txt', '.md', '.markdown'].includes(extension))
      throw new BadRequestException('Only TXT and Markdown files are supported');
    if (!['text/plain', 'text/markdown', 'text/x-markdown'].includes(input.mimeType))
      throw new BadRequestException('Uploaded file MIME type is not TXT or Markdown');
    if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(input.contentBase64))
      throw new BadRequestException('Uploaded file content is not valid base64');
    const bytes = Buffer.from(input.contentBase64, 'base64');
    if (!bytes.length || bytes.length > 10_000_000)
      throw new BadRequestException('Uploaded text file is empty or too large');
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    if (text.includes('\0')) throw new BadRequestException('Uploaded text contains binary data');
    return { text, mimeType: input.mimeType, sourceReference: input.filename };
  }
}
