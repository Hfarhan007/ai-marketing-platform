import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { Types } from 'mongoose';
import type { AiProviderName } from '../../ai/providers/ai-provider.interface.js';
import { AiGatewayService } from '../../ai/ai-gateway.service.js';
import { EmbeddingRepository } from '../repositories/embedding.repository.js';

export interface EmbeddingLimits {
  maxBatchSize: number;
  maxInputTokens: number;
  maxRetries: number;
}
export interface EmbeddingTarget {
  provider?: AiProviderName;
  model?: string;
  version?: string;
  indexName?: string;
  expectedDimension?: number;
}
export interface EmbeddableChunk {
  _id: Types.ObjectId;
  documentId: Types.ObjectId;
  text: string;
  textHash: string;
}

const PROVIDER_LIMITS: Record<AiProviderName, EmbeddingLimits> = {
  openai: { maxBatchSize: 128, maxInputTokens: 250_000, maxRetries: 3 },
  gemini: { maxBatchSize: 100, maxInputTokens: 100_000, maxRetries: 3 },
  ollama: { maxBatchSize: 32, maxInputTokens: 32_000, maxRetries: 2 },
  groq: { maxBatchSize: 32, maxInputTokens: 16_000, maxRetries: 2 },
  openrouter: { maxBatchSize: 64, maxInputTokens: 64_000, maxRetries: 3 },
};

@Injectable()
export class EmbeddingService {
  readonly version = 'embedding-lifecycle-v2';
  constructor(
    private readonly gateway: AiGatewayService,
    @Optional() private readonly repository?: EmbeddingRepository,
  ) {}

  async create(input: {
    workspaceId: string;
    userId: string;
    correlationId: string;
    texts: string[];
    target?: EmbeddingTarget;
    signal?: AbortSignal;
  }) {
    const limits = PROVIDER_LIMITS[input.target?.provider ?? 'openai'];
    const batches = this.batches(input.texts, limits);
    const vectors: number[][] = [];
    let inputTokens = 0,
      costUsd = 0,
      provider: string | undefined = input.target?.provider,
      model = input.target?.model;
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      this.assertNotCancelled(input.signal);
      const result = await this.embedWithPartialRetry(
        {
          ...input,
          texts: batches[batchIndex]!,
          correlationId: `${input.correlationId}:${batchIndex}`,
        },
        limits,
      );
      vectors.push(...result.vectors);
      inputTokens += result.usage.inputTokens;
      costUsd += result.costUsd;
      provider = result.provider;
      model = result.model;
    }
    return {
      vectors,
      usage: { inputTokens, outputTokens: 0 },
      costUsd,
      provider: provider!,
      model: model!,
    };
  }

  async embedChunks(input: {
    workspaceId: string;
    userId: string;
    correlationId: string;
    chunks: EmbeddableChunk[];
    target: EmbeddingTarget;
    transition?: boolean;
    signal?: AbortSignal;
  }) {
    if (!this.repository) throw new Error('Embedding persistence is unavailable');
    const version =
      input.target.version ??
      `${input.target.provider ?? 'auto'}:${input.target.model ?? 'routed'}`;
    const indexName =
      input.target.indexName ?? `knowledge-${version.replace(/[^a-z0-9]+/giu, '-')}`;
    const pending: EmbeddableChunk[] = [];
    const records: unknown[] = [];
    for (const chunk of input.chunks) {
      this.assertNotCancelled(input.signal);
      await this.repository.markStale(input.workspaceId, String(chunk._id), chunk.textHash);
      const existing = await this.repository.reusable(
        input.workspaceId,
        String(chunk._id),
        version,
        chunk.textHash,
      );
      if (existing) records.push(existing);
      else pending.push(chunk);
    }
    if (!pending.length)
      return {
        records,
        embedded: 0,
        reused: records.length,
        tokenUsage: 0,
        costUsd: 0,
        version,
        indexName,
      };
    const result = await this.create({
      workspaceId: input.workspaceId,
      userId: input.userId,
      correlationId: input.correlationId,
      texts: pending.map((chunk) => chunk.text),
      target: input.target,
      ...(input.signal ? { signal: input.signal } : {}),
    });
    if (result.vectors.length !== pending.length)
      throw new Error('Embedding provider returned an incomplete batch');
    const dimension = result.vectors[0]?.length ?? 0;
    if (
      !dimension ||
      result.vectors.some(
        (vector) => vector.length !== dimension || vector.some((value) => !Number.isFinite(value)),
      )
    )
      throw new BadRequestException('Invalid embedding vector dimensions');
    if (
      input.target.expectedDimension !== undefined &&
      dimension !== input.target.expectedDimension
    )
      throw new BadRequestException(
        `Expected ${input.target.expectedDimension}-dimension vectors, received ${dimension}`,
      );
    await this.repository.assertIndexDimension(input.workspaceId, indexName, dimension);
    const tokenShare = result.usage.inputTokens / pending.length,
      costShare = result.costUsd / pending.length;
    for (let index = 0; index < pending.length; index++) {
      const chunk = pending[index]!,
        vector = result.vectors[index]!;
      records.push(
        await this.repository.save({
          workspaceId: new Types.ObjectId(input.workspaceId),
          chunkId: chunk._id,
          documentId: chunk.documentId,
          provider: result.provider,
          model: result.model,
          vectorDimension: dimension,
          embeddingVersion: version,
          contentHash: chunk.textHash,
          vector,
          status: input.transition ? 'transition' : 'active',
          error: null,
          tokenUsage: tokenShare,
          costUsd: costShare,
          indexName,
        }),
      );
    }
    return {
      records,
      embedded: pending.length,
      reused: records.length - pending.length,
      tokenUsage: result.usage.inputTokens,
      costUsd: result.costUsd,
      version,
      indexName,
    };
  }

  async startMigration(input: {
    workspaceId: string;
    userId: string;
    provider: AiProviderName;
    model: string;
    version: string;
    targetIndex: string;
    sourceVersion?: string;
    expectedDimension?: number;
    signal?: AbortSignal;
  }) {
    if (!this.repository) throw new Error('Embedding persistence is unavailable');
    const chunks = (await this.repository.chunksForJob(
      input.workspaceId,
    )) as unknown as EmbeddableChunk[];
    const job = await this.repository.createJob({
      workspaceId: new Types.ObjectId(input.workspaceId),
      provider: input.provider,
      model: input.model,
      embeddingVersion: input.version,
      targetIndex: input.targetIndex,
      sourceVersion: input.sourceVersion ?? null,
      status: 'running',
      processed: 0,
      total: chunks.length,
      tokenUsage: 0,
      costUsd: 0,
      error: null,
    });
    try {
      const result = await this.embedChunks({
        workspaceId: input.workspaceId,
        userId: input.userId,
        correlationId: `embedding-migration:${String(job._id)}`,
        chunks,
        target: {
          provider: input.provider,
          model: input.model,
          version: input.version,
          indexName: input.targetIndex,
          ...(input.expectedDimension === undefined
            ? {}
            : { expectedDimension: input.expectedDimension }),
        },
        transition: true,
        ...(input.signal ? { signal: input.signal } : {}),
      });
      const current = await this.repository.job(input.workspaceId, String(job._id));
      if (current?.status === 'cancelled' || input.signal?.aborted)
        throw new Error('Embedding migration cancelled');
      await this.repository.updateJob(input.workspaceId, String(job._id), {
        $set: {
          status: 'completed',
          processed: chunks.length,
          tokenUsage: result.tokenUsage,
          costUsd: result.costUsd,
        },
      });
      return { jobId: String(job._id), ...result };
    } catch (error) {
      const cancelled =
        input.signal?.aborted ||
        (await this.repository.job(input.workspaceId, String(job._id)))?.status === 'cancelled';
      await this.repository.updateJob(input.workspaceId, String(job._id), {
        $set: {
          status: cancelled ? 'cancelled' : 'failed',
          error: error instanceof Error ? error.message : 'Embedding migration failed',
        },
      });
      throw error;
    }
  }

  cancel(workspaceId: string, jobId: string) {
    if (!this.repository) throw new Error('Embedding persistence is unavailable');
    return this.repository.cancelJob(workspaceId, jobId);
  }
  activateMigration(workspaceId: string, version: string) {
    if (!this.repository) throw new Error('Embedding persistence is unavailable');
    return this.repository.activateMigration(workspaceId, version);
  }

  private batches(texts: string[], limits: EmbeddingLimits) {
    if (!texts.length) throw new BadRequestException('Embedding input is empty');
    const output: string[][] = [];
    let current: string[] = [],
      tokens = 0;
    for (const text of texts) {
      const count = this.estimateTokens(text);
      if (count > limits.maxInputTokens)
        throw new BadRequestException('Embedding input exceeds provider token limit');
      if (current.length >= limits.maxBatchSize || tokens + count > limits.maxInputTokens) {
        output.push(current);
        current = [];
        tokens = 0;
      }
      current.push(text);
      tokens += count;
    }
    if (current.length) output.push(current);
    return output;
  }

  private async embedWithPartialRetry(
    input: {
      workspaceId: string;
      userId: string;
      correlationId: string;
      texts: string[];
      target?: EmbeddingTarget;
      signal?: AbortSignal;
    },
    limits: EmbeddingLimits,
  ) {
    let remaining = input.texts.map((text, index) => ({ text, index }));
    const vectors: number[][] = Array.from({ length: input.texts.length });
    let usage = 0,
      costUsd = 0,
      provider = '',
      model = '';
    for (let attempt = 0; remaining.length && attempt <= limits.maxRetries; attempt++) {
      this.assertNotCancelled(input.signal);
      const result = await this.gateway.embed({
        workspaceId: input.workspaceId,
        userId: input.userId,
        correlationId: `${input.correlationId}:retry-${attempt}`,
        inputs: remaining.map((entry) => entry.text),
        maxCostUsd: 10,
        ...(input.target?.model ? { preferredModel: input.target.model } : {}),
        ...(input.target?.provider ? { allowedProviders: [input.target.provider] } : {}),
        ...(input.signal ? { signal: input.signal } : {}),
      });
      provider = result.provider;
      model = result.model;
      usage += result.usage.inputTokens;
      costUsd += result.costUsd;
      const failed: typeof remaining = [];
      remaining.forEach((entry, index) => {
        const vector = result.vectors[index];
        if (vector?.length) vectors[entry.index] = vector;
        else failed.push(entry);
      });
      remaining = failed;
    }
    if (remaining.length)
      throw new Error(`Embedding provider failed ${remaining.length} input(s) after retry`);
    return { vectors, usage: { inputTokens: usage, outputTokens: 0 }, costUsd, provider, model };
  }

  private estimateTokens(text: string) {
    return Math.ceil(text.length / 4);
  }
  private assertNotCancelled(signal?: AbortSignal) {
    if (signal?.aborted) throw signal.reason ?? new Error('Embedding operation cancelled');
  }
}
