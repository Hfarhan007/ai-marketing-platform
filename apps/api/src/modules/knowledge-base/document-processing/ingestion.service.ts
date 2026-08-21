import { Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ChunkingService, hashContent, type ChunkingPolicy } from '../chunking/chunking.service.js';
import { EmbeddingService } from '../embeddings/embedding.service.js';
import { RagRepository } from '../repositories/rag.repository.js';
import { ContentSecurityService } from './content-security.service.js';
import { LanguageService } from './language.service.js';

@Injectable()
export class IngestionService {
  private readonly steps = [
    'validated',
    'extracted',
    'normalized',
    'language_detected',
    'sectioned',
    'chunked',
    'embedded',
    'saved',
    'indexed',
    'ready',
  ];
  constructor(
    private readonly repository: RagRepository,
    private readonly security: ContentSecurityService,
    private readonly chunking: ChunkingService,
    private readonly language: LanguageService,
    private readonly embeddings: EmbeddingService,
  ) {}
  async ingest(input: {
    workspaceId: string;
    userId: string;
    sourceId: string;
    idempotencyKey: string;
    content: string;
    mimeType?: string;
    allowedDomains?: string[];
    allowedMimeTypes?: string[];
    chunking?: Partial<ChunkingPolicy>;
    accessControl?: Record<string, unknown>;
    signal?: AbortSignal;
  }) {
    const source = await this.repository.source(input.workspaceId, input.sourceId);
    if (!source) throw new NotFoundException('Knowledge source not found');
    const job = await this.repository.reserveJob(
      input.workspaceId,
      input.sourceId,
      input.idempotencyKey,
    );
    if (job.status === 'completed')
      return { jobId: String(job._id), duplicate: true, status: job.status };
    try {
      await this.repository.updateJob(input.workspaceId, String(job._id), {
        $set: { status: 'running', error: null },
        $inc: { attempts: 1 },
      });
      const secured = this.security.validate({
        sourceType: source.sourceType,
        sourceReference: source.sourceReference,
        content: input.content,
        ...(input.mimeType ? { mimeType: input.mimeType } : {}),
        ...(input.allowedDomains ? { allowedDomains: input.allowedDomains } : {}),
        ...(input.allowedMimeTypes ? { allowedMimeTypes: input.allowedMimeTypes } : {}),
        trustLevel: source.trustLevel,
      });
      const normalized = this.chunking.normalize(secured.sanitized),
        contentHash = hashContent(normalized);
      const duplicate = await this.repository.existingDocument(
        input.workspaceId,
        input.sourceId,
        contentHash,
      );
      if (duplicate) {
        await this.finish(input.workspaceId, String(job._id), input.sourceId, contentHash);
        return {
          jobId: String(job._id),
          documentId: String(duplicate._id),
          duplicate: true,
          status: 'completed',
        };
      }
      const language = this.language.detect(normalized);
      const revision = await this.repository.nextRevision(input.workspaceId, input.sourceId);
      const document = await this.repository.createDocument({
        workspaceId: new Types.ObjectId(input.workspaceId),
        sourceId: new Types.ObjectId(input.sourceId),
        contentHash,
        revision,
        normalizedText: normalized,
        language,
        metadata: { sourceReference: source.sourceReference },
        status: 'active',
      });
      const accessControl = this.accessControl(
        input.accessControl,
        input.userId,
        source.collectionIds,
        secured.sensitivity.classification,
      );
      const chunks = this.chunking.chunkDocument({
        content: normalized,
        workspaceId: input.workspaceId,
        sourceId: input.sourceId,
        documentId: String(document._id),
        revisionId: `${revision}:${contentHash}`,
        language,
        sourceType: source.sourceType,
        accessControl,
        ...(input.chunking ? { policy: input.chunking } : {}),
      });
      const embedded = await this.embeddings.create({
        workspaceId: input.workspaceId,
        userId: input.userId,
        correlationId: input.idempotencyKey,
        texts: chunks.map((chunk) => chunk.text),
        ...(input.signal ? { signal: input.signal } : {}),
      });
      if (embedded.vectors.length !== chunks.length)
        throw new Error('Embedding provider returned an incomplete batch');
      await this.repository.replaceChunks(
        input.workspaceId,
        String(document._id),
        chunks.map((chunk, index) => ({
          workspaceId: new Types.ObjectId(input.workspaceId),
          collectionIds: source.collectionIds,
          sourceId: source._id,
          documentId: document._id,
          revisionId: chunk.revisionId,
          ordinal: chunk.ordinal,
          text: chunk.text,
          textHash: chunk.hash,
          embedding: embedded.vectors[index]!,
          embeddingVersion: `${embedded.provider}:${embedded.model}`,
          embeddingProvider: embedded.provider,
          embeddingModel: embedded.model,
          vectorDimension: embedded.vectors[index]!.length,
          embeddingStatus: 'active',
          embeddingError: null,
          embeddingTokenUsage: embedded.usage.inputTokens / chunks.length,
          embeddingCostUsd: embedded.costUsd / chunks.length,
          embeddingCreatedAt: new Date(),
          chunkingVersion: chunk.chunkingVersion,
          language,
          pageNumber: chunk.pageNumber,
          sectionHierarchy: chunk.sectionHierarchy,
          heading: chunk.heading,
          precedingContext: chunk.precedingContext,
          followingContext: chunk.followingContext,
          tokenCount: chunk.tokenCount,
          boundaryReason: chunk.boundaryReason,
          accessControl: chunk.accessControl,
          chunkType: chunk.chunkType,
          parentId: chunk.parentId,
          childIds: chunk.childIds,
          nearDuplicateOf: chunk.nearDuplicateOf,
          status: 'active',
          untrusted: secured.untrusted,
          injectionDetected: secured.injection.detected,
          metadata: {
            title: source.name,
            sourceName: source.name,
            contentHash: chunk.contentHash,
            trustLevel: source.trustLevel,
            instructionLike: secured.instructionLike,
            sensitivity: secured.sensitivity.classification,
            sensitiveCategories: secured.sensitivity.categories,
          },
        })),
      );
      await this.finish(input.workspaceId, String(job._id), input.sourceId, contentHash);
      return {
        jobId: String(job._id),
        documentId: String(document._id),
        duplicate: false,
        status: 'completed',
        chunks: chunks.length,
        contentHash,
        sourceRevision: revision,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ingestion failed';
      await Promise.all([
        this.repository.updateJob(input.workspaceId, String(job._id), {
          $set: { status: 'failed', error: message.slice(0, 1000) },
        }),
        this.repository.fail(input.workspaceId, input.sourceId, message),
      ]);
      throw error;
    }
  }
  private async finish(workspaceId: string, jobId: string, sourceId: string, contentHash: string) {
    await Promise.all([
      this.repository.updateJob(workspaceId, jobId, {
        $set: {
          status: 'completed',
          currentStep: 'ready',
          completedSteps: this.steps,
          checkpoint: 'ready',
        },
      }),
      this.repository.ready(workspaceId, sourceId, contentHash),
    ]);
  }
  deleteSource(workspaceId: string, sourceId: string) {
    return this.repository.deleteSource(workspaceId, sourceId);
  }
  private accessControl(
    configured: Record<string, unknown> | undefined,
    userId: string,
    collectionIds: string[],
    sensitivity: string,
  ) {
    const visibility = configured?.visibility;
    if (
      visibility !== undefined &&
      (typeof visibility !== 'string' ||
        !['public', 'workspace', 'restricted'].includes(visibility))
    )
      throw new Error('Invalid document visibility');
    const strings = (value: unknown) =>
      Array.isArray(value)
        ? value.filter((item): item is string => typeof item === 'string' && item.length > 0)
        : [];
    const restricted = visibility === 'restricted' || sensitivity !== 'internal';
    const groups = strings(configured?.groups),
      userIds = strings(configured?.userIds);
    if (restricted && !groups.length && !userIds.length) userIds.push(userId);
    return {
      visibility: restricted ? 'restricted' : visibility === 'public' ? 'public' : 'workspace',
      groups,
      userIds,
      collectionIds,
    };
  }
}
