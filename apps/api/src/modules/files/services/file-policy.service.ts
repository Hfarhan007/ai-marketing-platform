import { BadRequestException, Injectable } from '@nestjs/common';
import { extname, basename } from 'node:path';
const ALLOWED: ReadonlyMap<string, readonly string[]> = new Map([
  ['.jpg', ['image/jpeg']],
  ['.jpeg', ['image/jpeg']],
  ['.png', ['image/png']],
  ['.gif', ['image/gif']],
  ['.webp', ['image/webp']],
  ['.pdf', ['application/pdf']],
  ['.txt', ['text/plain']],
  ['.csv', ['text/csv', 'text/plain']],
  ['.md', ['text/markdown', 'text/plain']],
  ['.markdown', ['text/markdown', 'text/plain']],
  ['.html', ['text/html']],
  ['.htm', ['text/html']],
  ['.json', ['application/json', 'text/json']],
  ['.eml', ['message/rfc822', 'text/plain']],
  ['.mp4', ['video/mp4']],
  ['.mp3', ['audio/mpeg']],
  ['.wav', ['audio/wav', 'audio/x-wav']],
  ['.docx', ['application/vnd.openxmlformats-officedocument.wordprocessingml.document']],
  ['.pptx', ['application/vnd.openxmlformats-officedocument.presentationml.presentation']],
  ['.xlsx', ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']],
]);
@Injectable()
export class FilePolicyService {
  validateName(name: string) {
    const clean = basename(name)
      .normalize('NFKC')
      .replace(/[^\w.\- ()]/gu, '_')
      .slice(0, 255);
    if (clean !== name || name.includes('..') || /[\\/]/u.test(name))
      throw new BadRequestException('Invalid file name');
    const extension = extname(clean).toLowerCase();
    if (!ALLOWED.has(extension)) throw new BadRequestException('File extension is not allowed');
    return { clean, extension };
  }
  validateDeclared(extension: string, mime: string) {
    const allowed = ALLOWED.get(extension);
    if (!allowed?.includes(mime))
      throw new BadRequestException('MIME type does not match extension');
  }
  validateDetected(extension: string, mime: string) {
    this.validateDeclared(extension, mime);
    if (/(?:x-msdownload|x-executable|javascript|x-sh|x-bat)/u.test(mime))
      throw new BadRequestException('Executable files are blocked');
  }
}
