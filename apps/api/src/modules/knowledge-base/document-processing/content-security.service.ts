import { BadRequestException, Injectable } from '@nestjs/common';
import { PromptInjectionDetector } from '../../ai/safety/prompt-injection-detector.js';

@Injectable()
export class ContentSecurityService {
  constructor(private readonly injection: PromptInjectionDetector) {}
  validate(input: { sourceType: string; sourceReference: string; content: string; allowedDomains?: string[]; allowedMimeTypes?: string[]; mimeType?: string }) {
    if (input.content.length === 0 || input.content.length > 10_000_000) throw new BadRequestException('Content size policy rejected');
    if (input.mimeType && input.allowedMimeTypes && !input.allowedMimeTypes.includes(input.mimeType)) throw new BadRequestException('File type policy rejected');
    if (['url', 'website'].includes(input.sourceType)) {
      const url = new URL(input.sourceReference);
      if (url.protocol !== 'https:' || (input.allowedDomains?.length && !input.allowedDomains.includes(url.hostname))) throw new BadRequestException('Domain policy rejected');
    }
    const sanitized = input.content.replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu, '').replace(/<[^>]+>/gu, ' ');
    return { sanitized, injection: this.injection.detect(sanitized), untrusted: true };
  }
}
