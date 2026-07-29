import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventsModule } from '../../events/events.module.js';
import { KnowledgeSourceController } from './controllers/knowledge-source.controller.js';
import { KnowledgeSourceRepository } from './repositories/knowledge-source.repository.js';
import { KnowledgeSource, KnowledgeSourceSchema } from './schemas/knowledge-source.schema.js';
import { KnowledgeSourceService } from './services/knowledge-source.service.js';
import { AiModule } from '../ai/ai.module.js';
import { KnowledgeChunk, KnowledgeChunkSchema, KnowledgeDocument, KnowledgeDocumentSchema, KnowledgeIngestionJob, KnowledgeIngestionJobSchema, KnowledgeRetrievalLog, KnowledgeRetrievalLogSchema, RagEvaluation, RagEvaluationSchema } from './schemas/rag.schemas.js';
import { RagRepository } from './repositories/rag.repository.js';
import { AtlasVectorSearchAdapter } from './repositories/atlas-vector-search.adapter.js';
import { VECTOR_SEARCH_ADAPTER } from './vector-search/vector-search.types.js';
import { RERANKER, ScoreOnlyReranker } from './reranking/reranker.js';
import { ChunkingService } from './chunking/chunking.service.js';
import { ContentSecurityService } from './document-processing/content-security.service.js';
import { LanguageService } from './document-processing/language.service.js';
import { EmbeddingService } from './embeddings/embedding.service.js';
import { IngestionService } from './document-processing/ingestion.service.js';
import { CitationService } from './citations/citation.service.js';
import { RagRetrievalService } from './hybrid-search/rag-retrieval.service.js';
import { RagEvaluationService } from './rag-evaluation/rag-evaluation.service.js';
@Module({
  imports: [
    EventsModule,
    AiModule,
    MongooseModule.forFeature([
      { name: KnowledgeSource.name, schema: KnowledgeSourceSchema },
      { name: KnowledgeDocument.name, schema: KnowledgeDocumentSchema },
      { name: KnowledgeChunk.name, schema: KnowledgeChunkSchema },
      { name: KnowledgeIngestionJob.name, schema: KnowledgeIngestionJobSchema },
      { name: KnowledgeRetrievalLog.name, schema: KnowledgeRetrievalLogSchema },
      { name: RagEvaluation.name, schema: RagEvaluationSchema },
    ]),
  ],
  controllers: [KnowledgeSourceController],
  providers: [
    KnowledgeSourceRepository, KnowledgeSourceService, RagRepository,
    AtlasVectorSearchAdapter, { provide: VECTOR_SEARCH_ADAPTER, useExisting: AtlasVectorSearchAdapter },
    { provide: RERANKER, useClass: ScoreOnlyReranker },
    ChunkingService, ContentSecurityService, LanguageService, EmbeddingService,
    IngestionService, CitationService, RagRetrievalService, RagEvaluationService,
  ],
  exports: [KnowledgeSourceService, IngestionService, RagRetrievalService, RagEvaluationService],
})
export class KnowledgeBaseModule {}
