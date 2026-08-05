export const KNOWLEDGE_SOURCE_TYPES = [
  'uploaded_files',
  'website_urls',
  'sitemap',
  'manual_text',
  'faq',
  'crm_records',
  'product_catalogs',
  'help_center_articles',
  'google_drive',
  'notion',
  'confluence',
  'shopify_products',
  'external_api',
] as const;
export type KnowledgeSourceType = (typeof KNOWLEDGE_SOURCE_TYPES)[number];
export interface ConnectorContext {
  workspaceId: string;
  connectionId: string;
  configuration: Record<string, unknown>;
  credentials: Record<string, unknown>;
  checkpoint: string | null;
  signal?: AbortSignal;
}
export interface DiscoveredDocument {
  externalId: string;
  locator: string;
  revision: string;
  deleted?: boolean;
  metadata?: Record<string, unknown>;
}
export interface FetchedDocument {
  externalId: string;
  content: string;
  revision: string;
  mimeType?: string;
  metadata?: Record<string, unknown>;
}
export interface DiscoveryPage {
  documents: DiscoveredDocument[];
  checkpoint: string | null;
  complete: boolean;
  retryAfterMs?: number;
}
export interface ConnectorHealth {
  healthy: boolean;
  message?: string;
}
export interface KnowledgeConnector {
  readonly type: KnowledgeSourceType;
  validateConfiguration(configuration: Record<string, unknown>): Promise<void>;
  discoverDocuments(context: ConnectorContext): Promise<DiscoveryPage>;
  fetchDocument(context: ConnectorContext, document: DiscoveredDocument): Promise<FetchedDocument>;
  getRevisionIdentifier(context: ConnectorContext, document: DiscoveredDocument): Promise<string>;
  checkPermissions(context: ConnectorContext): Promise<boolean>;
  checkpointSync(context: ConnectorContext, checkpoint: string | null): Promise<void>;
  deleteConnection(context: ConnectorContext): Promise<void>;
  healthCheck(context: ConnectorContext): Promise<ConnectorHealth>;
}
