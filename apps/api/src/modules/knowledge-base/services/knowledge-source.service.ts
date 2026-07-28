import { Injectable } from '@nestjs/common';
import type { WorkspaceRequestContext } from '../../../common/types/workspace-context.js';
import { TransactionManagerService } from '../../../database/transactions/transaction-manager.service.js';
import { OutboxService } from '../../../events/outbox.service.js';
import type { IngestKnowledgeSourceDto } from '../dto/ingest-knowledge-source.dto.js';
import { KnowledgeSourceRepository } from '../repositories/knowledge-source.repository.js';
@Injectable()
export class KnowledgeSourceService {
  constructor(
    private readonly repository: KnowledgeSourceRepository,
    private readonly transactions: TransactionManagerService,
    private readonly outbox: OutboxService,
  ) {}
  ingest(c: WorkspaceRequestContext, d: IngestKnowledgeSourceDto) {
    return this.transactions.run(async (session) => {
      const result = await this.repository.reserve(c.workspaceId, c.userId, d, session);
      if (!result.duplicate)
        await this.outbox.append(
          {
            eventId: `knowledge-ingest:${c.workspaceId}:${d.idempotencyKey}`,
            eventType: 'knowledge.source.ingestion_requested',
            aggregateType: 'knowledgeSource',
            aggregateId: String(result.source._id),
            workspaceId: c.workspaceId,
            payload: {
              sourceId: String(result.source._id),
              sourceType: d.sourceType,
              sourceReference: d.sourceReference,
            },
            correlationId: d.idempotencyKey,
          },
          session,
        );
      return {
        sourceId: String(result.source._id),
        duplicate: result.duplicate,
        status: result.source.status,
      };
    });
  }
}
