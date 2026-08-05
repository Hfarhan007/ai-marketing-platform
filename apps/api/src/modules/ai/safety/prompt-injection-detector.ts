import { Injectable } from '@nestjs/common';
@Injectable()
export class PromptInjectionDetector {
  detect(value: string) {
    const patterns = [
      /ignore (?:all|previous) instructions/iu,
      /ignore all previous instructions/iu,
      /reveal (?:the )?(?:system prompt|secret)/iu,
      /developer mode/iu,
      /<\|(?:system|assistant)\|>/iu,
      /(?:system|developer|assistant)\s*:/iu,
      /(?:call|invoke|use)\s+(?:a\s+|the\s+)?(?:tool|function|api)/iu,
      /send\s+(?:the\s+)?(?:data|documents?|secrets?|credentials?)\s+to/iu,
      /(?:override|bypass|disable)\s+(?:safety|policy|permissions?|access control)/iu,
    ];
    const matches = patterns.filter((p) => p.test(value)).map((p) => p.source);
    return { detected: matches.length > 0, matches };
  }
}
