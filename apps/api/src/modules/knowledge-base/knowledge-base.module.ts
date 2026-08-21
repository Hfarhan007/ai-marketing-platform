import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventsModule } from '../../events/events.module.js';
import { KnowledgeSourceController } from './controllers/knowledge-source.controller.js';
import { KnowledgeSourceRepository } from './repositories/knowledge-source.repository.js';
import { KnowledgeSource, KnowledgeSourceSchema } from './schemas/knowledge-source.schema.js';
import { KnowledgeSourceService } from './services/knowledge-source.service.js';
import { AiModule } from '../ai/ai.module.js';
import {
  KnowledgeChunk,
  KnowledgeAnswerReview,
  KnowledgeAnswerReviewSchema,
  KnowledgeChunkSchema,
  KnowledgeDocument,
  KnowledgeDocumentSchema,
  KnowledgeEmbedding,
  KnowledgeEmbeddingJob,
  KnowledgeEmbeddingJobSchema,
  KnowledgeEmbeddingSchema,
  KnowledgeIngestionJob,
  KnowledgeIngestionJobSchema,
  KnowledgeRetrievalLog,
  KnowledgeRetrievalLogSchema,
  RagEvaluation,
  RagEvaluationSchema,
  RagDriftSnapshot,
  RagDriftSnapshotSchema,
} from './schemas/rag.schemas.js';
import { RagRepository } from './repositories/rag.repository.js';
import { AtlasVectorSearchAdapter } from './repositories/atlas-vector-search.adapter.js';
import { VECTOR_SEARCH_ADAPTER } from './vector-search/vector-search.types.js';
import { DeterministicReranker, RERANKER } from './reranking/reranker.js';
import { ContextAssemblyService } from './context-assembly/context-assembly.service.js';
import { ChunkingService } from './chunking/chunking.service.js';
import { ContentSecurityService } from './document-processing/content-security.service.js';
import { LanguageService } from './document-processing/language.service.js';
import { EmbeddingService } from './embeddings/embedding.service.js';
import { EmbeddingRepository } from './repositories/embedding.repository.js';
import { IngestionService } from './document-processing/ingestion.service.js';
import { CitationService } from './citations/citation.service.js';
import { RagRetrievalService } from './hybrid-search/rag-retrieval.service.js';
import { RagEvaluationService } from './rag-evaluation/rag-evaluation.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { KnowledgeConnectorRegistry } from './connectors/connector-registry.js';
import { ConnectorUrlSecurityService } from './connectors/connector-url-security.service.js';
import { ConnectorCredentialVaultService } from './connectors/connector-credential-vault.service.js';
import { KnowledgeConnectorRepository } from './connectors/connector.repository.js';
import { ConnectorSyncService } from './connectors/connector-sync.service.js';
import { ConnectorRegistrar } from './connectors/connector-registrar.service.js';
import { KnowledgeConnectorController } from './controllers/knowledge-connector.controller.js';
import { CacheModule } from '../../cache/cache.module.js';
import { GroundedAnswerService } from './grounded-answer/grounded-answer.service.js';
import { TextSourceExtractorService } from './document-processing/text-source-extractor.service.js';
import { CompleteRagSliceService } from './services/complete-rag-slice.service.js';
@Module({
  imports: [
    EventsModule,
    AiModule,
    AuthModule,
    CacheModule,
    MongooseModule.forFeature([
      { name: KnowledgeSource.name, schema: KnowledgeSourceSchema },
      { name: KnowledgeDocument.name, schema: KnowledgeDocumentSchema },
      { name: KnowledgeChunk.name, schema: KnowledgeChunkSchema },
      { name: KnowledgeEmbedding.name, schema: KnowledgeEmbeddingSchema },
      { name: KnowledgeEmbeddingJob.name, schema: KnowledgeEmbeddingJobSchema },
      { name: KnowledgeIngestionJob.name, schema: KnowledgeIngestionJobSchema },
      { name: KnowledgeRetrievalLog.name, schema: KnowledgeRetrievalLogSchema },
      { name: KnowledgeAnswerReview.name, schema: KnowledgeAnswerReviewSchema },
      { name: RagEvaluation.name, schema: RagEvaluationSchema },
      { name: RagDriftSnapshot.name, schema: RagDriftSnapshotSchema },
    ]),
  ],
  controllers: [KnowledgeSourceController, KnowledgeConnectorController],
  providers: [
    KnowledgeSourceRepository,
    KnowledgeSourceService,
    RagRepository,
    AtlasVectorSearchAdapter,
    { provide: VECTOR_SEARCH_ADAPTER, useExisting: AtlasVectorSearchAdapter },
    { provide: RERANKER, useClass: DeterministicReranker },
    ContextAssemblyService,
    ChunkingService,
    ContentSecurityService,
    LanguageService,
    EmbeddingService,
    EmbeddingRepository,
    IngestionService,
    CitationService,
    RagRetrievalService,
    GroundedAnswerService,
    TextSourceExtractorService,
    CompleteRagSliceService,
    RagEvaluationService,
    KnowledgeConnectorRegistry,
    ConnectorUrlSecurityService,
    ConnectorCredentialVaultService,
    KnowledgeConnectorRepository,
    ConnectorSyncService,
    ConnectorRegistrar,
  ],
  exports: [
    KnowledgeSourceService,
    IngestionService,
    RagRetrievalService,
    GroundedAnswerService,
    RagEvaluationService,
    KnowledgeConnectorRegistry,
    ConnectorSyncService,
  ],
})
export class KnowledgeBaseModule {}
