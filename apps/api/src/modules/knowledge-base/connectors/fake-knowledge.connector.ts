import type { ConnectorContext, DiscoveryPage, DiscoveredDocument, FetchedDocument, KnowledgeConnector, KnowledgeSourceType } from './knowledge-connector.types.js';
export class FakeKnowledgeConnector implements KnowledgeConnector {
  readonly type: KnowledgeSourceType = 'manual_text'; pages: DiscoveryPage[] = []; contents = new Map<string, string>(); failures = 0; checkpoints: Array<string | null> = [];
  validateConfiguration() { return Promise.resolve(); }
  async discoverDocuments() { await Promise.resolve(); if (this.failures-- > 0) throw Object.assign(new Error('fake rate limit'), { retryable: true, retryAfterMs: 1 }); return this.pages.shift() ?? { documents: [], checkpoint: null, complete: true }; }
  fetchDocument(_context: ConnectorContext, document: DiscoveredDocument): Promise<FetchedDocument> { return Promise.resolve({ externalId: document.externalId, content: this.contents.get(document.externalId) ?? document.externalId, revision: document.revision }); }
  getRevisionIdentifier(_context: ConnectorContext, document: DiscoveredDocument) { return Promise.resolve(document.revision); }
  checkPermissions() { return Promise.resolve(true); }
  checkpointSync(_context: ConnectorContext, checkpoint: string | null) { this.checkpoints.push(checkpoint); return Promise.resolve(); }
  deleteConnection() { return Promise.resolve(); }
  healthCheck() { return Promise.resolve({ healthy: true }); }
}
