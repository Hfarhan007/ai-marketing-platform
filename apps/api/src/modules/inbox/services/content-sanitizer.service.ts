import { Injectable } from '@nestjs/common';
@Injectable()
export class ContentSanitizerService {
  sanitize(content: string, type: string): string {
    const trimmed = content.trim().slice(0, 50_000);
    if (type !== 'html') return trimmed.replaceAll('\u0000', '');
    return trimmed
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, '')
      .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/giu, '')
      .replace(/\b(?:javascript|data):/giu, '');
  }
}
