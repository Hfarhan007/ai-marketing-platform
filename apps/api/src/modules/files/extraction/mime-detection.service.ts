import { BadRequestException, Injectable } from '@nestjs/common';
import { fileTypeFromBuffer } from 'file-type';
const TEXT_MIME: Record<string, string> = { '.txt': 'text/plain', '.md': 'text/markdown', '.markdown': 'text/markdown', '.csv': 'text/csv', '.html': 'text/html', '.htm': 'text/html', '.json': 'application/json', '.eml': 'message/rfc822' };
@Injectable()
export class MimeDetectionService {
  async detect(content: Buffer, extension: string) { const detected = await fileTypeFromBuffer(content), fallback = TEXT_MIME[extension.toLowerCase()], mime = detected?.mime ?? fallback; if (!mime) throw new BadRequestException('Unable to detect a supported MIME type'); return mime; }
}
