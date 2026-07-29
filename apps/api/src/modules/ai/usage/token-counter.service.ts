import { Injectable } from '@nestjs/common';
import type { AiMessage } from '../providers/ai-provider.interface.js';
@Injectable()
export class TokenCounterService {
  countText(value: string) {
    return Math.max(1, Math.ceil(Buffer.byteLength(value, 'utf8') / 4));
  }
  countMessages(messages: readonly AiMessage[]) {
    return messages.reduce((sum, m) => sum + 4 + this.countText(m.content), 2);
  }
}
