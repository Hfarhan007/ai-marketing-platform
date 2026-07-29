import { Inject, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { AiGatewayService } from '../../ai/ai-gateway.service.js';
import { ContentSecurityService } from '../document-processing/content-security.service.js';
import { RagRepository } from '../repositories/rag.repository.js';
import { CitationService } from '../citations/citation.service.js';
import { RERANKER, type Reranker } from '../reranking/reranker.js';
import { VECTOR_SEARCH_ADAPTER, type VectorFilters, type VectorSearchAdapter } from '../vector-search/vector-search.types.js';

@Injectable()
export class RagRetrievalService {
  constructor(private readonly ai: AiGatewayService, @Inject(VECTOR_SEARCH_ADAPTER) private readonly vectors: VectorSearchAdapter, @Inject(RERANKER) private readonly reranker: Reranker, private readonly citations: CitationService, private readonly security: ContentSecurityService, private readonly repository: RagRepository) {}
  async retrieve(input: { workspaceId: string; userId: string; correlationId: string; query: string; filters?: VectorFilters; limit?: number }) {
    const started = Date.now();
    const embedded = await this.ai.embed({ correlationId: input.correlationId, workspaceId: input.workspaceId, userId: input.userId, inputs: [input.query], maxCostUsd: 0.1 });
    const filters = input.filters ?? {}, limit = Math.min(input.limit ?? 8, 20);
    const [vectorHits, keywordHits] = await Promise.all([
      this.vectors.search(input.workspaceId, embedded.vectors[0] ?? [], filters, limit),
      this.repository.keywordSearch(input.workspaceId, input.query, filters, limit),
    ]);
    const combined = new Map(vectorHits.map((hit) => [String(hit.id), hit]));
    for (const hit of keywordHits) {
      const previous = combined.get(String(hit.id));
      combined.set(String(hit.id), previous ? { ...previous, score: previous.score * 0.7 + hit.score * 0.3 } : { ...hit, score: hit.score * 0.3 });
    }
    const raw = [...combined.values()].sort((a, b) => b.score - a.score).slice(0, limit);
    const safe = raw.filter((hit) => !this.security.validate({ sourceType: 'text', sourceReference: '', content: hit.text }).injection.detected);
    const hits = await this.reranker.rerank(input.query, safe);
    await this.repository.logRetrieval({ workspaceId: input.workspaceId, correlationId: input.correlationId, queryHash: createHash('sha256').update(input.query).digest('hex'), results: hits.map((hit) => ({ chunkId: String(hit.id), score: hit.score })), durationMs: Date.now() - started });
    return { hits, citations: this.citations.create(hits) };
  }
}
