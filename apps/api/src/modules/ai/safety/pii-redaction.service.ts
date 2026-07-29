import { Injectable } from '@nestjs/common';
@Injectable()
export class PiiRedactionService {
  redact(value: string) {
    return value
      .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu, '[EMAIL]')
      .replace(/(?<!\w)(?:\+?\d[\d .()-]{7,}\d)\b/gu, '[PHONE]')
      .replace(/\b(?:sk|key|token)[-_][A-Za-z0-9_-]{12,}\b/giu, '[SECRET]');
  }
}
