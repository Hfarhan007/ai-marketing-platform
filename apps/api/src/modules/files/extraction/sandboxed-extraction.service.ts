import { BadRequestException, Injectable, RequestTimeoutException } from '@nestjs/common';
import { Worker } from 'node:worker_threads';
import type { ExtractionLimits, TextExtractionResult } from './text-extraction.types.js';
@Injectable()
export class SandboxedExtractionService {
  extract(input: {
    content: Buffer;
    extension: string;
    mimeType: string;
    limits: ExtractionLimits;
    timeoutMs: number;
  }) {
    return new Promise<TextExtractionResult>((resolve, reject) => {
      const worker = new Worker(new URL('./extraction.worker.js', import.meta.url), {
          resourceLimits: {
            maxOldGenerationSizeMb: 128,
            maxYoungGenerationSizeMb: 32,
            stackSizeMb: 4,
          },
        }),
        timer = setTimeout(() => {
          void worker.terminate();
          reject(new RequestTimeoutException('Text extraction timed out'));
        }, input.timeoutMs);
      worker.once(
        'message',
        (message: { ok: boolean; result?: TextExtractionResult; error?: string }) => {
          clearTimeout(timer);
          void worker.terminate();
          if (message.ok && message.result) resolve(message.result);
          else reject(new BadRequestException(message.error ?? 'Text extraction failed'));
        },
      );
      worker.once('error', (error) => {
        clearTimeout(timer);
        void worker.terminate();
        reject(error instanceof Error ? error : new Error('Extraction worker failed'));
      });
      worker.postMessage({
        content: input.content,
        extension: input.extension,
        mimeType: input.mimeType,
        limits: input.limits,
      });
    });
  }
}
