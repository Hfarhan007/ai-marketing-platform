import { Injectable } from '@nestjs/common';
@Injectable()
export class LanguageService {
  detect(text: string) {
    if (/[\u0600-\u06ff]/u.test(text)) return 'ur';
    if (/[\u4e00-\u9fff]/u.test(text)) return 'zh';
    if (/[\u0400-\u04ff]/u.test(text)) return 'ru';
    return 'en';
  }
}
