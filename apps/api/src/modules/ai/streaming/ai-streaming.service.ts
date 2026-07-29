import { Injectable } from '@nestjs/common';
import type { AiProvider, AiRequest, AiStreamChunk } from '../providers/ai-provider.interface.js';
@Injectable()
export class AiStreamingService {
  async *stream(provider: AiProvider, request: AiRequest): AsyncIterable<AiStreamChunk> {
    for await (const chunk of provider.stream(request)) {
      if (request.signal?.aborted) throw request.signal.reason;
      yield chunk;
    }
  }
}
