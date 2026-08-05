import { Inject, Injectable, Optional } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import type { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../../../cache/redis.constants.js';
import { AiGatewayService } from '../../ai/ai-gateway.service.js';
import { CitationService } from '../citations/citation.service.js';
import { ContentSecurityService } from '../document-processing/content-security.service.js';
import { LanguageService } from '../document-processing/language.service.js';
import { RagRepository } from '../repositories/rag.repository.js';
import { RERANKER, type Reranker } from '../reranking/reranker.js';
import { ContextAssemblyService } from '../context-assembly/context-assembly.service.js';
import {
  VECTOR_SEARCH_ADAPTER,
  type VectorFilters,
  type VectorHit,
  type VectorSearchAdapter,
} from '../vector-search/vector-search.types.js';

export type RetrievalMode = 'keyword' | 'vector' | 'hybrid';
export type FusionMode = 'rrf' | 'weighted';
export interface RetrievalStage {
  name: string;
  durationMs: number;
  inputCount?: number;
  outputCount?: number;
  detail?: Record<string, unknown>;
}
export interface RetrievalPolicy {
  mode: RetrievalMode;
  fusion: FusionMode;
  keywordWeight: number;
  vectorWeight: number;
  rrfK: number;
  perSourceLimit: number;
  perDocumentLimit: number;
  tokenBudget: number;
  timeoutMs: number;
  candidateLimit: number;
}

export interface RetrievalInput {
  workspaceId: string;
  userId: string;
  correlationId: string;
  query: string;
  filters?: VectorFilters;
  limit?: number;
  policy?: Partial<RetrievalPolicy>;
  explain?: boolean;
  administrator?: boolean;
}

const DEFAULT_POLICY: RetrievalPolicy = {
  mode: 'hybrid',
  fusion: 'rrf',
  keywordWeight: 0.4,
  vectorWeight: 0.6,
  rrfK: 60,
  perSourceLimit: 3,
  perDocumentLimit: 2,
  tokenBudget: 2_400,
  timeoutMs: 8_000,
  candidateLimit: 40,
};

@Injectable()
export class RagRetrievalService {
  constructor(
    private readonly ai: AiGatewayService,
    @Inject(VECTOR_SEARCH_ADAPTER) private readonly vectors: VectorSearchAdapter,
    @Inject(RERANKER) private readonly reranker: Reranker,
    private readonly citations: CitationService,
    private readonly security: ContentSecurityService,
    private readonly repository: RagRepository,
    private readonly language: LanguageService,
    private readonly contextAssembly: ContextAssemblyService,
    @Optional() @Inject(REDIS_CLIENT) private readonly cache?: Redis,
  ) {}

  async retrieve(input: RetrievalInput) {
    const policy = { ...DEFAULT_POLICY, ...(input.policy ?? {}) };
    this.validatePolicy(policy);
    const timeout = new AbortController();
    const timer = setTimeout(
      () => timeout.abort(new Error('Retrieval timed out')),
      policy.timeoutMs,
    );
    try {
      return await Promise.race([
        this.run(input, policy, timeout.signal),
        new Promise<never>((_, reject) =>
          timeout.signal.addEventListener(
            'abort',
            () =>
              reject(
                timeout.signal.reason instanceof Error
                  ? timeout.signal.reason
                  : new Error('Retrieval timed out'),
              ),
            {
              once: true,
            },
          ),
        ),
      ]);
    } finally {
      clearTimeout(timer);
    }
  }

  private async run(input: RetrievalInput, policy: RetrievalPolicy, signal: AbortSignal) {
    const started = Date.now(),
      stages: RetrievalStage[] = [],
      retrievalTraceId = randomUUID();
    const queryPolicy = this.security.checkQuery(input.query);
    if (queryPolicy.risk === 'high')
      throw new Error('Suspicious query rejected by retrieval policy');
    const stage = async <T>(
      name: string,
      action: () => Promise<T> | T,
      counts?: (value: T) => {
        inputCount?: number;
        outputCount?: number;
        detail?: Record<string, unknown>;
      },
    ) => {
      const before = Date.now(),
        value = await action(),
        info = counts?.(value) ?? {};
      stages.push({ name, durationMs: Date.now() - before, ...info });
      return value;
    };
    const rawQuery = await stage('query_validation', () => this.validateQuery(input.query));
    const normalized = await stage('query_normalization', () =>
      rawQuery.normalize('NFKC').replace(/\s+/gu, ' ').trim().toLocaleLowerCase(),
    );
    const language = await stage(
      'language_detection',
      () => input.filters?.language ?? this.language.detect(normalized),
      (value) => ({ detail: { language: value } }),
    );
    const intent = await stage(
      'intent_classification',
      () => this.intent(normalized),
      (value) => ({ detail: { intent: value } }),
    );
    const query = await stage(
      'query_rewriting',
      () => this.rewrite(normalized, intent),
      (value) => ({ detail: { rewritten: value !== normalized, query: value } }),
    );
    const filters = await stage('metadata_filter_resolution', () =>
      this.resolveFilters(input.filters ?? {}, language, input.userId),
    );
    const cacheKey = this.cacheKey(input.workspaceId, query, filters, policy);
    const cached = await this.cacheGet(cacheKey);
    if (cached) {
      const cacheStage = { name: 'retrieval_cache', durationMs: 0, detail: { hit: true } };
      await this.repository.logRetrieval({
        workspaceId: input.workspaceId,
        correlationId: input.correlationId,
        retrievalTraceId,
        queryHash: createHash('sha256').update(rawQuery).digest('hex'),
        userId: input.userId,
        queryRisk: queryPolicy.risk,
        suspiciousQuery: queryPolicy.suspicious,
        suspiciousQueryReasons: queryPolicy.reasons,
        accessPrincipal: {
          userId: filters.accessControlUserId,
          groups: filters.accessControlGroups ?? [],
        },
        results: cached.hits.map((hit) => ({ chunkId: String(hit.id), score: hit.score })),
        stages: [cacheStage],
        durationMs: Date.now() - started,
      });
      return {
        ...cached,
        retrievalTraceId,
        stages: input.explain && input.administrator ? [cacheStage, ...cached.stages] : undefined,
        cached: true,
      };
    }
    const candidateLimit = Math.min(Math.max(policy.candidateLimit, input.limit ?? 8), 100);
    const keywordHits = await stage(
      'keyword_retrieval',
      async () =>
        policy.mode === 'vector'
          ? []
          : this.repository.keywordSearch(input.workspaceId, query, filters, candidateLimit),
      (value) => ({ outputCount: value.length }),
    );
    const vectorHits = await stage(
      'vector_retrieval',
      async () => {
        if (policy.mode === 'keyword') return [];
        const embedded = await this.ai.embed({
          correlationId: input.correlationId,
          workspaceId: input.workspaceId,
          userId: input.userId,
          inputs: [query],
          maxCostUsd: 0.1,
          signal,
        });
        return this.vectors.search(
          input.workspaceId,
          embedded.vectors[0] ?? [],
          filters,
          candidateLimit,
        );
      },
      (value) => ({ outputCount: value.length }),
    );
    const fused = await stage(
      'result_fusion',
      () => this.fuse(keywordHits, vectorHits, policy),
      (value) => ({
        inputCount: keywordHits.length + vectorHits.length,
        outputCount: value.length,
        detail: { mode: policy.mode, fusion: policy.fusion },
      }),
    );
    const deduplicated = await stage(
      'deduplication',
      () => this.deduplicate(fused),
      (value) => ({ inputCount: fused.length, outputCount: value.length }),
    );
    const accessControlled = deduplicated.filter((hit) =>
      this.allowed(hit, filters.accessControlGroups ?? [], filters.accessControlUserId),
    );
    const safe = accessControlled.map((hit) => ({
      ...hit,
      metadata: {
        ...hit.metadata,
        untrusted:
          hit.untrusted === true ||
          hit.injectionDetected === true ||
          this.security.validate({
            sourceType: 'text',
            sourceReference: '',
            content: hit.text,
          }).injection.detected,
      },
    }));
    const bounded = safe.slice(0, Math.min(this.reranker.maxCandidates, policy.candidateLimit));
    const reranked = await stage(
      'reranking',
      async () => {
        try {
          return await this.reranker.rerank({
            query,
            hits: bounded,
            workspaceId: input.workspaceId,
            userId: input.userId,
            correlationId: input.correlationId,
            signal,
          });
        } catch (error) {
          return {
            hits: bounded,
            provider: 'fallback',
            model: 'fused-score',
            latencyMs: 0,
            costUsd: 0,
            inputCount: bounded.length,
            fallback: true,
            error: error instanceof Error ? error.message : 'reranker failure',
          };
        }
      },
      (value) => ({
        inputCount: value.inputCount,
        outputCount: value.hits.length,
        detail: {
          provider: value.provider,
          model: value.model,
          latencyMs: value.latencyMs,
          costUsd: value.costUsd,
          fallback: value.fallback ?? false,
          ...(value.error ? { error: value.error } : {}),
        },
      }),
    );
    const assembled = await stage(
      'context_selection',
      () =>
        this.contextAssembly.assemble(reranked.hits, {
          limit: Math.min(input.limit ?? 8, 20),
          tokenBudget: policy.tokenBudget,
          perSourceLimit: policy.perSourceLimit,
          perDocumentLimit: policy.perDocumentLimit,
        }),
      (value) => ({
        inputCount: reranked.hits.length,
        outputCount: value.hits.length,
        detail: { removedOverlapCount: value.removedOverlapCount },
      }),
    );
    const budgeted = await stage(
      'token_budgeting',
      () => ({ hits: assembled.hits, tokens: assembled.tokenCount }),
      (value) => ({
        inputCount: assembled.hits.length,
        outputCount: value.hits.length,
        detail: { usedTokens: value.tokens, budget: policy.tokenBudget },
      }),
    );
    const citations = await stage(
      'citation_preparation',
      () => this.citations.create(budgeted.hits),
      (value) => ({ outputCount: value.length }),
    );
    const noResults = budgeted.hits.length === 0;
    const result = {
      hits: budgeted.hits,
      retrievalTraceId,
      context: {
        applicationInstruction: assembled.applicationInstruction,
        retrievedContent: assembled.content,
        tokenCount: assembled.tokenCount,
      },
      citations,
      noResults,
      security: { queryRisk: queryPolicy.risk, suspiciousQuery: queryPolicy.suspicious },
      ...(noResults
        ? {
            reason:
              accessControlled.length === 0 && deduplicated.length
                ? 'access_control_filtered'
                : 'no_matching_results',
          }
        : {}),
      stages,
      cached: false,
    };
    await Promise.all([
      this.repository.logRetrieval({
        workspaceId: input.workspaceId,
        correlationId: input.correlationId,
        retrievalTraceId,
        queryHash: createHash('sha256').update(rawQuery).digest('hex'),
        userId: input.userId,
        queryRisk: queryPolicy.risk,
        suspiciousQuery: queryPolicy.suspicious,
        suspiciousQueryReasons: queryPolicy.reasons,
        accessPrincipal: {
          userId: filters.accessControlUserId,
          groups: filters.accessControlGroups ?? [],
        },
        results: budgeted.hits.map((hit) => ({
          chunkId: String(hit.id),
          score: hit.score,
          rawVectorScore: hit.rawVectorScore,
          rawKeywordScore: hit.rawKeywordScore,
          fusedScore: hit.fusedScore,
          rerankerScore: hit.rerankerScore,
        })),
        stages,
        durationMs: Date.now() - started,
      }),
      this.cacheSet(cacheKey, result),
    ]);
    return { ...result, stages: input.explain && input.administrator ? stages : undefined };
  }

  private validateQuery(query: string) {
    if (typeof query !== 'string' || query.trim().length < 2 || query.length > 2_000)
      throw new Error('Query must contain between 2 and 2000 characters');
    return query;
  }
  private validatePolicy(policy: RetrievalPolicy) {
    if (
      policy.keywordWeight < 0 ||
      policy.vectorWeight < 0 ||
      policy.keywordWeight + policy.vectorWeight <= 0 ||
      policy.perSourceLimit < 1 ||
      policy.perDocumentLimit < 1 ||
      policy.tokenBudget < 1 ||
      policy.timeoutMs < 50
    )
      throw new Error('Invalid retrieval policy');
  }
  private intent(query: string) {
    if (/\b(?:how|steps?|guide)\b/iu.test(query)) return 'how_to';
    if (/\b(?:price|cost|plan)\b/iu.test(query)) return 'pricing';
    if (/\b(?:what|who|when|where|why)\b/iu.test(query)) return 'question';
    return 'lookup';
  }
  private rewrite(query: string, intent: string) {
    const concise = query.replace(
      /^(?:please\s+)?(?:tell|show|explain)\s+(?:me\s+)?(?:about\s+)?/iu,
      '',
    );
    return intent === 'pricing' && !/pricing/iu.test(concise)
      ? `${concise} pricing plans`
      : concise;
  }
  private resolveFilters(filters: VectorFilters, language: string, userId: string): VectorFilters {
    return {
      ...filters,
      accessControlUserId: userId,
      language: filters.language ?? language,
      status: 'active',
      metadata: { ...(filters.metadata ?? {}) },
    };
  }

  private fuse(keyword: VectorHit[], vector: VectorHit[], policy: RetrievalPolicy) {
    const combined = new Map<string, VectorHit>();
    const add = (hit: VectorHit, kind: 'keyword' | 'vector', rank: number) => {
      const id = String(hit.id),
        previous = combined.get(id) ?? { ...hit, score: 0, fusedScore: 0, retrievalRanks: {} };
      const raw = hit.score,
        contribution =
          policy.fusion === 'rrf'
            ? (kind === 'keyword' ? policy.keywordWeight : policy.vectorWeight) /
              (policy.rrfK + rank)
            : (kind === 'keyword' ? policy.keywordWeight : policy.vectorWeight) * raw;
      const boosted = contribution * this.boost(hit);
      combined.set(id, {
        ...previous,
        ...(kind === 'keyword' ? { rawKeywordScore: raw } : { rawVectorScore: raw }),
        retrievalRanks: { ...previous.retrievalRanks, [kind]: rank },
        fusedScore: (previous.fusedScore ?? 0) + boosted,
        score: (previous.fusedScore ?? 0) + boosted,
      });
    };
    keyword.forEach((hit, index) => add(hit, 'keyword', index + 1));
    vector.forEach((hit, index) => add(hit, 'vector', index + 1));
    return [...combined.values()].sort((a, b) => (b.fusedScore ?? 0) - (a.fusedScore ?? 0));
  }
  private boost(hit: VectorHit) {
    const authoritative = hit.metadata.authoritative === true ? 1.2 : 1;
    const trust =
      hit.metadata.trustLevel === 'trusted'
        ? 1.1
        : hit.injectionDetected === true ||
            (Array.isArray(hit.metadata.instructionLike) && hit.metadata.instructionLike.length > 0)
          ? 0.5
          : 1;
    const created =
      typeof hit.metadata.createdAt === 'string' ? Date.parse(hit.metadata.createdAt) : 0;
    const ageDays = created ? Math.max(0, (Date.now() - created) / 86_400_000) : 365;
    return authoritative * trust * (1 + 0.15 * Math.exp(-ageDays / 90));
  }
  private deduplicate(hits: VectorHit[]) {
    const seen = new Set<string>();
    return hits.filter((hit) => {
      const key =
        typeof hit.metadata.contentHash === 'string'
          ? hit.metadata.contentHash
          : `${hit.documentId}:${hit.text.trim().toLocaleLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  private allowed(hit: VectorHit, groups: string[], userId?: string) {
    const configured = hit.accessControl?.groups ?? hit.metadata.accessControlGroups;
    const required = Array.isArray(configured)
      ? configured.filter((value): value is string => typeof value === 'string')
      : [];
    const userIds = hit.accessControl?.userIds ?? hit.metadata.accessControlUserIds;
    const permittedUsers = Array.isArray(userIds)
      ? userIds.filter((value): value is string => typeof value === 'string')
      : [];
    const visibility =
      hit.accessControl?.visibility ??
      hit.metadata.accessControlVisibility ??
      (required.length || permittedUsers.length ? 'restricted' : 'workspace');
    return (
      visibility === 'workspace' ||
      visibility === 'public' ||
      required.some((group) => groups.includes(group)) ||
      (Boolean(userId) && permittedUsers.includes(userId!))
    );
  }
  private cacheKey(
    workspaceId: string,
    query: string,
    filters: VectorFilters,
    policy: RetrievalPolicy,
  ) {
    return `retrieval:${workspaceId}:${createHash('sha256').update(JSON.stringify({ query, filters, policy })).digest('hex')}`;
  }
  private async cacheGet(key: string) {
    try {
      const value = await this.cache?.get(key);
      return value
        ? (JSON.parse(value) as {
            hits: VectorHit[];
            context: {
              applicationInstruction: string;
              retrievedContent: string;
              tokenCount: number;
            };
            citations: unknown[];
            noResults: boolean;
            reason?: string;
            stages: RetrievalStage[];
          })
        : null;
    } catch {
      return null;
    }
  }
  private async cacheSet(key: string, value: unknown) {
    if (!this.cache) return;
    await this.cache.set(key, JSON.stringify(value), 'EX', 300).catch(() => undefined);
  }
}
