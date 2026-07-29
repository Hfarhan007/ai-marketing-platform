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
    ];
    const matches = patterns.filter((p) => p.test(value)).map((p) => p.source);
    return { detected: matches.length > 0, matches };
  }
}
