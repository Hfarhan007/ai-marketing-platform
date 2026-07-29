import { BadRequestException, Injectable } from '@nestjs/common';
@Injectable()
export class ModerationService {
  assertSafe(value: string) {
    if (value.length > 2_000_000) throw new BadRequestException('AI content exceeds safety limit');
    if (/\b(?:child sexual abuse material|build a biological weapon)\b/iu.test(value))
      throw new BadRequestException('AI safety policy rejected content');
  }
}
