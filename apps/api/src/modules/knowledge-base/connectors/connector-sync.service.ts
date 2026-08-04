import { BadRequestException, Injectable } from '@nestjs/common';
import { KnowledgeConnectorRegistry } from './connector-registry.js';
import { ConnectorCredentialVaultService } from './connector-credential-vault.service.js';
import { KnowledgeConnectorRepository } from './connector.repository.js';
import { IngestionService } from '../document-processing/ingestion.service.js';
import type {
  ConnectorContext,
  KnowledgeSourceType,
} from './knowledge-connector.types.js';
@Injectable()
export class ConnectorSyncService {
  constructor(
    private readonly repository: KnowledgeConnectorRepository,
    private readonly registry: KnowledgeConnectorRegistry,
    private readonly vault: ConnectorCredentialVaultService,
    private readonly ingestion: IngestionService,
  ) {}
  async create(input: {
    workspaceId: string;
    userId: string;
    type: KnowledgeSourceType;
    name: string;
    configuration: Record<string, unknown>;
    credentials?: Record<string, unknown>;
    allowedDomains?: string[];
  }) {
    const connector = this.registry.get(input.type);
    await connector.validateConfiguration(input.configuration);
    const result = await this.repository.create({
      workspaceId: input.workspaceId,
      userId: input.userId,
      type: input.type,
      name: input.name,
      encryptedConfiguration: this.vault.seal(input.configuration),
      encryptedCredentials: this.vault.seal(input.credentials ?? {}),
      allowedDomains: input.allowedDomains ?? [],
    });
    return { connectionId: String(result.insertedId), status: 'active' };
  }
  async sync(input: {
    workspaceId: string;
    userId: string;
    connectionId: string;
    idempotencyKey: string;
    maxDocuments?: number;
    maxRetries?: number;
    signal?: AbortSignal;
  }) {
    const connection = await this.repository.getConnection(input.workspaceId, input.connectionId),
      run = await this.repository.reserveRun(input);
    if (run!.status === 'completed')
      return { runId: String(run!._id), duplicate: true, status: 'completed' };
    const connector = this.registry.get(connection.type as KnowledgeSourceType),
      context: ConnectorContext = {
        workspaceId: input.workspaceId,
        connectionId: input.connectionId,
        configuration: this.vault.open(String(connection.encryptedConfiguration)),
        credentials: this.vault.open(String(connection.encryptedCredentials)),
        checkpoint: connection.checkpoint as string | null,
        ...(input.signal ? { signal: input.signal } : {}),
      };
    if (!(await connector.checkPermissions(context)))
      throw new BadRequestException('Connector permission check failed');
    const known = new Map(
        (await this.repository.knownDocuments(input.workspaceId, input.connectionId)).map(
          (item) => [String(item.externalId), item],
        ),
      ),
      seen = new Set<string>();
    let discovered = 0,
      fetched = 0,
      unchanged = 0,
      deleted = 0,
      retries = 0,
      page;
    try {
      do {
        page = await this.retry(
          () => connector.discoverDocuments(context),
          input.maxRetries ?? 3,
          (count) => {
            retries += count;
          },
        );
        for (const document of page.documents) {
          if (++discovered > (input.maxDocuments ?? 10_000))
            throw new BadRequestException('Connector document limit exceeded');
          seen.add(document.externalId);
          const prior = known.get(document.externalId),
            currentRevision = await connector.getRevisionIdentifier(context, document);
          if (document.deleted) {
            deleted += await this.remove(
              input.workspaceId,
              input.connectionId,
              document.externalId,
            );
            continue;
          }
          if (prior?.revision === currentRevision) {
            unchanged++;
            continue;
          }
          const fetchedDocument = await this.retry(
            () => connector.fetchDocument(context, document),
            input.maxRetries ?? 3,
            (count) => {
              retries += count;
            },
          );
          this.assertSize(
            fetchedDocument.content,
            Number(context.configuration.maxContentBytes ?? 5_000_000),
          );
          const sourceId = await this.repository.upsertDocument({
            workspaceId: input.workspaceId,
            connectionId: input.connectionId,
            userId: input.userId,
            externalId: document.externalId,
            revision: fetchedDocument.revision,
            locator: document.locator,
          });
          await this.ingestion.ingest({
            workspaceId: input.workspaceId,
            userId: input.userId,
            sourceId,
            idempotencyKey: `connector:${input.connectionId}:${document.externalId}:${fetchedDocument.revision}`,
            content: fetchedDocument.content,
            ...(fetchedDocument.mimeType ? { mimeType: fetchedDocument.mimeType } : {}),
            allowedDomains: (connection.allowedDomains as string[]) ?? [],
            ...(input.signal ? { signal: input.signal } : {}),
          });
          fetched++;
        }
        context.checkpoint = page.checkpoint;
        await connector.checkpointSync(context, page.checkpoint);
        await this.repository.checkpoint(input.workspaceId, input.connectionId, page.checkpoint);
      } while (!page.complete);
      for (const externalId of known.keys())
        if (!seen.has(externalId))
          deleted += await this.remove(input.workspaceId, input.connectionId, externalId);
      await this.repository.finishRun(input.workspaceId, String(run!._id), {
        status: 'completed',
        discovered,
        fetched,
        unchanged,
        deleted,
        retries,
        checkpoint: context.checkpoint,
      });
      return {
        runId: String(run!._id),
        duplicate: false,
        status: 'completed',
        discovered,
        fetched,
        unchanged,
        deleted,
        retries,
      };
    } catch (error) {
      await this.repository.finishRun(input.workspaceId, String(run!._id), {
        status: 'failed',
        discovered,
        fetched,
        unchanged,
        deleted,
        retries,
        error: error instanceof Error ? error.message.slice(0, 1000) : 'sync_failed',
      });
      throw error;
    }
  }
  async delete(workspaceId: string, connectionId: string) {
    const connection = await this.repository.getConnection(workspaceId, connectionId),
      connector = this.registry.get(connection.type as KnowledgeSourceType),
      context = {
        workspaceId,
        connectionId,
        configuration: this.vault.open(String(connection.encryptedConfiguration)),
        credentials: this.vault.open(String(connection.encryptedCredentials)),
        checkpoint: connection.checkpoint as string | null,
      };
    await connector.deleteConnection(context);
    for (const item of await this.repository.knownDocuments(workspaceId, connectionId))
      await this.remove(workspaceId, connectionId, String(item.externalId));
    await this.repository.deleteConnection(workspaceId, connectionId);
    return { deleted: true };
  }
  private async remove(workspaceId: string, connectionId: string, externalId: string) {
    const item = await this.repository.markDeleted(workspaceId, connectionId, externalId);
    if (!item) return 0;
    await this.ingestion.deleteSource(workspaceId, String(item.sourceId));
    return 1;
  }
  private assertSize(content: string, limit: number) {
    if (!content.length || Buffer.byteLength(content) > limit)
      throw new BadRequestException('Connector content exceeds size limit');
  }
  private async retry<T>(
    operation: () => Promise<T>,
    maximum: number,
    counted: (count: number) => void,
  ) {
    let count = 0;
    for (;;) {
      try {
        const result = await operation();
        counted(count);
        return result;
      } catch (error) {
        const retryable = (error as { retryable?: boolean }).retryable === true;
        if (!retryable || count >= maximum) {
          counted(count);
          throw error;
        }
        const wait = Math.min(
          30_000,
          (error as { retryAfterMs?: number }).retryAfterMs ?? 100 * 2 ** count,
        );
        count++;
        await new Promise((resolve) => setTimeout(resolve, wait));
      }
    }
  }
}
