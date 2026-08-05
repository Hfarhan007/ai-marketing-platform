import { Injectable, NotFoundException } from '@nestjs/common';
import type { KnowledgeConnector, KnowledgeSourceType } from './knowledge-connector.types.js';
@Injectable()
export class KnowledgeConnectorRegistry {
  private readonly connectors = new Map<KnowledgeSourceType, KnowledgeConnector>();
  register(connector: KnowledgeConnector) {
    if (this.connectors.has(connector.type))
      throw new Error(`Duplicate knowledge connector: ${connector.type}`);
    this.connectors.set(connector.type, connector);
  }
  get(type: KnowledgeSourceType) {
    const connector = this.connectors.get(type);
    if (!connector) throw new NotFoundException(`Knowledge connector is unavailable: ${type}`);
    return connector;
  }
}
