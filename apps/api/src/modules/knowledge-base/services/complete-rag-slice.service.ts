import { BadRequestException, Injectable } from '@nestjs/common';
import type { WorkspaceRequestContext } from '../../../common/types/workspace-context.js';
import type { CompleteRagSliceDto } from '../dto/rag.dto.js';
import { IngestionService } from '../document-processing/ingestion.service.js';
import { TextSourceExtractorService, type TextSourceInput } from '../document-processing/text-source-extractor.service.js';
import { GroundedAnswerService } from '../grounded-answer/grounded-answer.service.js';
import { KnowledgeSourceService } from './knowledge-source.service.js';

@Injectable()
export class CompleteRagSliceService {
  constructor(private readonly sources: KnowledgeSourceService, private readonly extractor: TextSourceExtractorService, private readonly ingestion: IngestionService, private readonly answers: GroundedAnswerService) {}
  async execute(context: WorkspaceRequestContext, dto: CompleteRagSliceDto) {
    const extracted = this.extract(dto);
    const source = await this.sources.ingest(context, {
      name: dto.name,
      sourceType: dto.sourceType === 'manual_text' ? 'manual_text' : 'uploaded_document',
      sourceReference: extracted.sourceReference,
      idempotencyKey: dto.idempotencyKey,
      collectionIds: dto.collectionIds ?? [],
      trustLevel: 'untrusted',
    });
    const ingestion = await this.ingestion.ingest({
      workspaceId: context.workspaceId,
      userId: context.userId,
      sourceId: source.sourceId,
      idempotencyKey: `${dto.idempotencyKey}:revision`,
      content: extracted.text,
      mimeType: extracted.mimeType,
      allowedMimeTypes: ['text/plain', 'text/markdown', 'text/x-markdown'],
      ...(dto.accessControl ? { accessControl: dto.accessControl } : {}),
    });
    const answer = await this.answers.answer({
      workspaceId: context.workspaceId,
      userId: context.userId,
      correlationId: dto.idempotencyKey,
      query: dto.question,
      filters: { sourceIds: [source.sourceId], accessControlGroups: context.roleIds, accessControlUserId: context.userId },
      policy: { mode: 'hybrid', ...(dto.tokenBudget ? { tokenBudget: dto.tokenBudget } : {}) },
    });
    return { source, ingestion, answer };
  }
  private extract(dto: CompleteRagSliceDto) {
    let input: TextSourceInput;
    if (dto.sourceType === 'manual_text') {
      if (dto.text === undefined) throw new BadRequestException('text is required for manual_text');
      input = { sourceType: 'manual_text', text: dto.text };
    } else {
      if (!dto.filename || !dto.mimeType || !dto.contentBase64)
        throw new BadRequestException('filename, mimeType and contentBase64 are required for uploaded_file');
      input = { sourceType: 'uploaded_file', filename: dto.filename, mimeType: dto.mimeType, contentBase64: dto.contentBase64 };
    }
    return this.extractor.extract(input);
  }
}
