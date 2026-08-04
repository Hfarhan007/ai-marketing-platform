import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type {
  ConnectorContext,
  DiscoveredDocument,
  FetchedDocument,
  KnowledgeConnector,
  KnowledgeSourceType,
} from './knowledge-connector.types.js';
import { ConnectorUrlSecurityService } from './connector-url-security.service.js';

const revision = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');
const scalar = (value: unknown, fallback: string | number) =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : String(fallback);
export class InlineKnowledgeConnector implements KnowledgeConnector {
  constructor(readonly type: KnowledgeSourceType) {}
  async validateConfiguration(configuration: Record<string, unknown>) {
    const documents = configuration.documents;
    if (!Array.isArray(documents))
      throw new BadRequestException('Connector documents must be an array');
    await Promise.resolve();
  }
  async discoverDocuments(context: ConnectorContext) {
    await Promise.resolve();
    const documents = context.configuration.documents as Array<Record<string, unknown>>;
    return {
      documents: documents.map((item, index) => ({
        externalId: scalar(item.id, index),
        locator: scalar(item.id, index),
        revision: scalar(item.revision, revision(item)),
        deleted: item.deleted === true,
      })),
      checkpoint: revision(documents),
      complete: true,
    };
  }
  async fetchDocument(
    context: ConnectorContext,
    document: DiscoveredDocument,
  ): Promise<FetchedDocument> {
    await Promise.resolve();
    const item = (context.configuration.documents as Array<Record<string, unknown>>).find(
      (value, index) => scalar(value.id, index) === document.externalId,
    );
    if (!item || typeof item.content !== 'string')
      throw new BadRequestException('Connector document content is missing');
    return {
      externalId: document.externalId,
      content: item.content,
      revision: document.revision,
      ...(typeof item.mimeType === 'string' ? { mimeType: item.mimeType } : {}),
    };
  }
  getRevisionIdentifier(_context: ConnectorContext, document: DiscoveredDocument) {
    return Promise.resolve(document.revision);
  }
  checkPermissions() {
    return Promise.resolve(true);
  }
  checkpointSync() {
    return Promise.resolve();
  }
  deleteConnection() {
    return Promise.resolve();
  }
  healthCheck() {
    return Promise.resolve({ healthy: true });
  }
}
export class PlaceholderKnowledgeConnector extends InlineKnowledgeConnector {
  override validateConfiguration() {
    return Promise.resolve();
  }
  override discoverDocuments() {
    return Promise.reject(
      new ServiceUnavailableException(
        `${this.type} connector is a placeholder and is not configured`,
      ),
    );
  }
  override healthCheck() {
    return Promise.resolve({ healthy: false, message: `${this.type} connector is not configured` });
  }
}
export class UrlKnowledgeConnector implements KnowledgeConnector {
  constructor(
    readonly type: KnowledgeSourceType,
    private readonly security: ConnectorUrlSecurityService,
  ) {}
  async validateConfiguration(configuration: Record<string, unknown>) {
    if (
      !Array.isArray(configuration.urls) ||
      !Array.isArray(configuration.allowedDomains) ||
      !configuration.allowedDomains.length
    )
      throw new BadRequestException('URLs and an explicit domain allowlist are required');
    for (const url of configuration.urls)
      await this.security.assertAllowed(String(url), configuration.allowedDomains as string[]);
  }
  async discoverDocuments(context: ConnectorContext) {
    await Promise.resolve();
    const urls = context.configuration.urls as string[];
    return {
      documents: urls.map((url) => ({
        externalId: revision(url),
        locator: url,
        revision: String(
          (context.configuration.revisions as Record<string, string> | undefined)?.[url] ??
            revision(url),
        ),
      })),
      checkpoint: revision(urls),
      complete: true,
    };
  }
  async fetchDocument(context: ConnectorContext, document: DiscoveredDocument) {
    const url = await this.security.assertAllowed(
        document.locator,
        context.configuration.allowedDomains as string[],
      ),
      response = await fetch(url, {
        redirect: 'error',
        ...(context.signal ? { signal: context.signal } : {}),
      });
    if (response.status === 429)
      throw Object.assign(new Error('Connector rate limited'), {
        retryable: true,
        retryAfterMs: Number(response.headers.get('retry-after') ?? 1) * 1_000,
      });
    if (!response.ok)
      throw Object.assign(new Error(`Connector returned ${response.status}`), {
        retryable: response.status >= 500,
      });
    const limit = Number(context.configuration.maxContentBytes ?? 5_000_000),
      length = Number(response.headers.get('content-length') ?? 0);
    if (length > limit) throw new BadRequestException('Connector content exceeds size limit');
    const content = await response.text();
    if (Buffer.byteLength(content) > limit)
      throw new BadRequestException('Connector content exceeds size limit');
    return {
      externalId: document.externalId,
      content,
      revision:
        response.headers.get('etag') ?? response.headers.get('last-modified') ?? revision(content),
      mimeType: response.headers.get('content-type')?.split(';')[0] ?? 'text/html',
    };
  }
  getRevisionIdentifier(_context: ConnectorContext, document: DiscoveredDocument) {
    return Promise.resolve(document.revision);
  }
  checkPermissions() {
    return Promise.resolve(true);
  }
  checkpointSync() {
    return Promise.resolve();
  }
  deleteConnection() {
    return Promise.resolve();
  }
  healthCheck() {
    return Promise.resolve({ healthy: true });
  }
}
