import { Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ChunkingService, hashContent } from '../chunking/chunking.service.js';
import { EmbeddingService } from '../embeddings/embedding.service.js';
import { RagRepository } from '../repositories/rag.repository.js';
import { ContentSecurityService } from './content-security.service.js';
import { LanguageService } from './language.service.js';

@Injectable()
export class IngestionService {
  private readonly steps = ['validated', 'extracted', 'normalized', 'language_detected', 'sectioned', 'chunked', 'embedded', 'saved', 'indexed', 'ready'];
  constructor(private readonly repository: RagRepository, private readonly security: ContentSecurityService, private readonly chunking: ChunkingService, private readonly language: LanguageService, private readonly embeddings: EmbeddingService) {}
  async ingest(input: { workspaceId: string; userId: string; sourceId: string; idempotencyKey: string; content: string; mimeType?: string; allowedDomains?: string[]; allowedMimeTypes?: string[]; signal?: AbortSignal }) {
    const source = await this.repository.source(input.workspaceId, input.sourceId);
    if (!source) throw new NotFoundException('Knowledge source not found');
    const job = await this.repository.reserveJob(input.workspaceId, input.sourceId, input.idempotencyKey);
    if (job.status === 'completed') return { jobId: String(job._id), duplicate: true, status: job.status };
    try {
      await this.repository.updateJob(input.workspaceId, String(job._id), { $set: { status: 'running', error: null }, $inc: { attempts: 1 } });
      const secured = this.security.validate({ sourceType: source.sourceType, sourceReference: source.sourceReference, content: input.content, ...(input.mimeType ? { mimeType: input.mimeType } : {}), ...(input.allowedDomains ? { allowedDomains: input.allowedDomains } : {}), ...(input.allowedMimeTypes ? { allowedMimeTypes: input.allowedMimeTypes } : {}) });
      const normalized = this.chunking.normalize(secured.sanitized), contentHash = hashContent(normalized);
      const duplicate = await this.repository.existingDocument(input.workspaceId, input.sourceId, contentHash);
      if (duplicate) {
        await this.finish(input.workspaceId, String(job._id), input.sourceId, contentHash);
        return { jobId: String(job._id), documentId: String(duplicate._id), duplicate: true, status: 'completed' };
      }
      const language = this.language.detect(normalized);
      const document = await this.repository.createDocument({ workspaceId: new Types.ObjectId(input.workspaceId), sourceId: new Types.ObjectId(input.sourceId), contentHash, normalizedText: normalized, language, metadata: { sourceReference: source.sourceReference }, status: 'active' });
      const chunks = this.chunking.chunk(normalized);
      const embedded = await this.embeddings.create({ workspaceId: input.workspaceId, userId: input.userId, correlationId: input.idempotencyKey, texts: chunks.map((chunk) => chunk.text), ...(input.signal ? { signal: input.signal } : {}) });
      if (embedded.vectors.length !== chunks.length) throw new Error('Embedding provider returned an incomplete batch');
      await this.repository.replaceChunks(input.workspaceId, String(document._id), chunks.map((chunk, index) => ({ workspaceId: new Types.ObjectId(input.workspaceId), collectionIds: source.collectionIds, sourceId: source._id, documentId: document._id, ordinal: chunk.ordinal, text: chunk.text, textHash: chunk.hash, embedding: embedded.vectors[index]!, embeddingVersion: `${embedded.provider}:${embedded.model}`, chunkingVersion: this.chunking.version, language, status: 'active', untrusted: secured.untrusted, injectionDetected: secured.injection.detected, metadata: { sourceName: source.name } })));
      await this.finish(input.workspaceId, String(job._id), input.sourceId, contentHash);
      return { jobId: String(job._id), documentId: String(document._id), duplicate: false, status: 'completed', chunks: chunks.length };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ingestion failed';
      await Promise.all([this.repository.updateJob(input.workspaceId, String(job._id), { $set: { status: 'failed', error: message.slice(0, 1000) } }), this.repository.fail(input.workspaceId, input.sourceId, message)]);
      throw error;
    }
  }
  private async finish(workspaceId: string, jobId: string, sourceId: string, contentHash: string) {
    await Promise.all([this.repository.updateJob(workspaceId, jobId, { $set: { status: 'completed', currentStep: 'ready', completedSteps: this.steps, checkpoint: 'ready' } }), this.repository.ready(workspaceId, sourceId, contentHash)]);
  }
  deleteSource(workspaceId: string, sourceId: string) { return this.repository.deleteSource(workspaceId, sourceId); }
}
