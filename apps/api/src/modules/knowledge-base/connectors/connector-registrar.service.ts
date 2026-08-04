import { Injectable, OnModuleInit } from '@nestjs/common';
import { KnowledgeConnectorRegistry } from './connector-registry.js';
import { ConnectorUrlSecurityService } from './connector-url-security.service.js';
import { InlineKnowledgeConnector, PlaceholderKnowledgeConnector, UrlKnowledgeConnector } from './builtin-connectors.js';
@Injectable()
export class ConnectorRegistrar implements OnModuleInit {
  constructor(private readonly registry: KnowledgeConnectorRegistry, private readonly urlSecurity: ConnectorUrlSecurityService) {}
  onModuleInit() {
    for (const type of ['uploaded_files', 'manual_text', 'faq', 'crm_records', 'product_catalogs', 'help_center_articles', 'shopify_products'] as const) this.registry.register(new InlineKnowledgeConnector(type));
    for (const type of ['website_urls', 'sitemap', 'external_api'] as const) this.registry.register(new UrlKnowledgeConnector(type, this.urlSecurity));
    for (const type of ['google_drive', 'notion', 'confluence'] as const) this.registry.register(new PlaceholderKnowledgeConnector(type));
  }
}
