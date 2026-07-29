import { Injectable } from '@nestjs/common';
import { AiGatewayService } from '../../ai/ai-gateway.service.js';
@Injectable()
export class EmbeddingService {
  readonly version = 'provider-model-v1';
  constructor(private readonly gateway: AiGatewayService) {}
  create(input: { workspaceId: string; userId: string; correlationId: string; texts: string[]; signal?: AbortSignal }) {
    return this.gateway.embed({ workspaceId: input.workspaceId, userId: input.userId, correlationId: input.correlationId, inputs: input.texts, maxCostUsd: 1, ...(input.signal ? { signal: input.signal } : {}) });
  }
}
