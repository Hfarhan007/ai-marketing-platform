import { BadRequestException, Injectable } from '@nestjs/common';
import { PromptInjectionDetector } from '../../ai/safety/prompt-injection-detector.js';

@Injectable()
export class ContentSecurityService {
  constructor(private readonly injection: PromptInjectionDetector) {}

  validate(input: {
    sourceType: string;
    sourceReference: string;
    content: string;
    allowedDomains?: string[];
    allowedMimeTypes?: string[];
    mimeType?: string;
    trustLevel?: 'trusted' | 'untrusted';
  }) {
    if (input.content.length === 0 || Buffer.byteLength(input.content, 'utf8') > 10_000_000)
      throw new BadRequestException('Content size policy rejected');
    if (
      input.mimeType &&
      input.allowedMimeTypes &&
      !input.allowedMimeTypes.includes(input.mimeType)
    )
      throw new BadRequestException('File type policy rejected');
    if (['url', 'website'].includes(input.sourceType)) {
      const url = new URL(input.sourceReference);
      if (
        url.protocol !== 'https:' ||
        url.username ||
        url.password ||
        (input.allowedDomains?.length &&
          !input.allowedDomains.some(
            (domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`),
          ))
      )
        throw new BadRequestException('Domain policy rejected');
    }
    const decoded = this.decodeEntities(input.content).replace(
      /[\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/gu,
      '',
    );
    const sanitized = decoded
      .replace(/<!--([\s\S]*?)-->/gu, ' ')
      .replace(
        /<(?:script|style|template|iframe|object|embed|svg|math)\b[^>]*>[\s\S]*?<\/(?:script|style|template|iframe|object|embed|svg|math)>/giu,
        ' ',
      )
      .replace(
        /<[^>]+(?:hidden|display\s*:\s*none|visibility\s*:\s*hidden|font-size\s*:\s*0)[^>]*>[\s\S]*?<\/[^>]+>/giu,
        ' ',
      )
      .replace(/<[^>]+>/gu, ' ')
      .replace(/\s+/gu, ' ')
      .trim();
    const injection = this.injection.detect(sanitized),
      instructionLike = this.instructionLike(sanitized),
      sensitivity = this.classifySensitive(sanitized);
    return {
      sanitized,
      injection,
      instructionLike,
      sensitivity,
      untrusted: input.trustLevel !== 'trusted' || injection.detected || instructionLike.length > 0,
    };
  }

  checkQuery(query: string) {
    if (Buffer.byteLength(query, 'utf8') > 8_000)
      throw new BadRequestException('Query size policy rejected');
    const patterns = [
      /(?:dump|export|reveal|list)\s+(?:all|every)\s+(?:documents?|records?|secrets?|customers?)/iu,
      /(?:other|another)\s+(?:tenant|workspace|customer)/iu,
      /(?:api[-_ ]?keys?|passwords?|access[-_ ]?tokens?|system prompt)/iu,
      /ignore\s+(?:all|previous)\s+(?:rules|instructions)/iu,
    ];
    const reasons = patterns
      .filter((pattern) => pattern.test(query))
      .map((pattern) => pattern.source);
    return {
      suspicious: reasons.length > 0,
      reasons,
      risk: reasons.length > 1 ? 'high' : reasons.length ? 'medium' : 'low',
    };
  }

  redactOutput(value: string) {
    return value
      .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu, '[REDACTED_EMAIL]')
      .replace(/\b(?:\d[ -]*?){13,19}\b/gu, '[REDACTED_PAYMENT_CARD]')
      .replace(/\b(?:sk|pk|api)[-_][A-Za-z0-9_-]{12,}\b/gu, '[REDACTED_SECRET]')
      .replace(/\b\d{3}-\d{2}-\d{4}\b/gu, '[REDACTED_GOVERNMENT_ID]');
  }
  private instructionLike(value: string) {
    const patterns = [
      /(?:system|assistant|developer)\s*:/iu,
      /(?:do not|never)\s+(?:tell|reveal|mention)/iu,
      /(?:call|use|invoke)\s+(?:the\s+)?(?:tool|function|api)/iu,
      /send\s+(?:data|secrets?|documents?)\s+to/iu,
    ];
    return patterns.filter((pattern) => pattern.test(value)).map((pattern) => pattern.source);
  }
  private classifySensitive(value: string) {
    const categories: string[] = [];
    if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/iu.test(value)) categories.push('email');
    if (/\b\d{3}-\d{2}-\d{4}\b/gu.test(value)) categories.push('government_id');
    if (/\b(?:\d[ -]*?){13,19}\b/gu.test(value)) categories.push('payment_card');
    if (/\b(?:sk|pk|api)[-_][A-Za-z0-9_-]{12,}\b/gu.test(value)) categories.push('secret');
    return {
      classification: categories.some((item) =>
        ['government_id', 'payment_card', 'secret'].includes(item),
      )
        ? 'restricted'
        : categories.length
          ? 'confidential'
          : 'internal',
      categories,
    };
  }
  private decodeEntities(value: string) {
    const named: Record<string, string> = {
      amp: '&',
      lt: '<',
      gt: '>',
      quot: '"',
      apos: "'",
      nbsp: ' ',
    };
    return value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/giu, (_, entity: string) => {
      if (entity.startsWith('#x'))
        return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
      if (entity.startsWith('#')) return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
      return named[entity.toLowerCase()] ?? ' ';
    });
  }
}
