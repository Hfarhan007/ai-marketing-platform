import { Body, Controller, Delete, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequireWorkspace } from '../../../common/decorators/require-workspace.decorator.js';
import { WorkspaceContext } from '../../../common/decorators/workspace-context.decorator.js';
import type { WorkspaceRequestContext } from '../../../common/types/workspace-context.js';
import { RequirePermissions } from '../../permissions/decorators/require-permissions.decorator.js';
import { IngestKnowledgeSourceDto } from '../dto/ingest-knowledge-source.dto.js';
import { KnowledgeSourceService } from '../services/knowledge-source.service.js';
import { IngestionService } from '../document-processing/ingestion.service.js';
import { RagRetrievalService } from '../hybrid-search/rag-retrieval.service.js';
import {
  EmbeddingMigrationDto,
  ProcessKnowledgeDto,
  RetrieveKnowledgeDto,
} from '../dto/rag.dto.js';
import { EmbeddingService } from '../embeddings/embedding.service.js';
@ApiTags('knowledge base')
@Controller('knowledge-base/sources')
@RequireWorkspace()
export class KnowledgeSourceController {
  constructor(
    private readonly service: KnowledgeSourceService,
    private readonly ingestion: IngestionService,
    private readonly retrieval: RagRetrievalService,
    private readonly embeddings: EmbeddingService,
  ) {}
  @Post('ingest') @RequirePermissions('files.manage') ingest(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Body() d: IngestKnowledgeSourceDto,
  ) {
    return this.service.ingest(c, d);
  }
  @Post(':sourceId/process') @RequirePermissions('files.manage') process(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Param('sourceId') sourceId: string,
    @Body() d: ProcessKnowledgeDto,
  ) {
    return this.ingestion.ingest({
      workspaceId: c.workspaceId,
      userId: c.userId,
      sourceId,
      idempotencyKey: d.idempotencyKey,
      content: d.content,
      ...(d.mimeType ? { mimeType: d.mimeType } : {}),
      ...(d.accessControl ? { accessControl: d.accessControl } : {}),
      chunking: {
        ...(d.chunkingStrategy ? { strategy: d.chunkingStrategy } : {}),
        ...(d.chunkSize ? { targetTokens: d.chunkSize, maxTokens: d.chunkSize } : {}),
        ...(d.chunkOverlap !== undefined ? { overlapTokens: d.chunkOverlap } : {}),
        ...(d.createParentChunks !== undefined ? { createParentChunks: d.createParentChunks } : {}),
        ...(d.createSummaryChunks !== undefined
          ? { createSummaryChunks: d.createSummaryChunks }
          : {}),
        ...(d.nearDuplicateThreshold !== undefined
          ? { nearDuplicateThreshold: d.nearDuplicateThreshold }
          : {}),
      },
    });
  }
  @Post('retrieve') @RequirePermissions('files.read') retrieve(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Body() d: RetrieveKnowledgeDto,
  ) {
    return this.retrieval.retrieve({
      workspaceId: c.workspaceId,
      userId: c.userId,
      correlationId: d.correlationId,
      query: d.query,
      filters: {
        ...(d.collectionIds ? { collectionIds: d.collectionIds } : {}),
        ...(d.sourceIds ? { sourceIds: d.sourceIds } : {}),
        ...(d.language ? { language: d.language } : {}),
        ...(d.metadata ? { metadata: d.metadata } : {}),
      },
    });
  }
  @Delete(':sourceId') @RequirePermissions('files.manage') delete(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Param('sourceId') sourceId: string,
  ) {
    return this.ingestion.deleteSource(c.workspaceId, sourceId);
  }
  @Post('embeddings/migrations') @RequirePermissions('files.manage') migrateEmbeddings(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Body() d: EmbeddingMigrationDto,
  ) {
    return this.embeddings.startMigration({
      workspaceId: c.workspaceId,
      userId: c.userId,
      provider: d.provider,
      model: d.model,
      version: d.version,
      targetIndex: d.targetIndex,
      ...(d.sourceVersion ? { sourceVersion: d.sourceVersion } : {}),
      ...(d.expectedDimension === undefined ? {} : { expectedDimension: d.expectedDimension }),
    });
  }
  @Post('embeddings/migrations/:jobId/cancel')
  @RequirePermissions('files.manage')
  cancelEmbeddingMigration(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Param('jobId') jobId: string,
  ) {
    return this.embeddings.cancel(c.workspaceId, jobId);
  }
  @Post('embeddings/migrations/:version/activate')
  @RequirePermissions('files.manage')
  activateEmbeddingMigration(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Param('version') version: string,
  ) {
    return this.embeddings.activateMigration(c.workspaceId, version);
  }
}
