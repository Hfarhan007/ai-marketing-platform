import { createHash } from 'node:crypto';

export interface FactoryContext { sequence: number; workspaceId: string }

export class TestDataFactory {
  private sequence = 0;
  constructor(private readonly seed = 'backend-tests') {}

  context(overrides: Partial<FactoryContext> = {}): FactoryContext {
    return { sequence: ++this.sequence, workspaceId: this.objectId('workspace'), ...overrides };
  }

  user(overrides: Record<string, unknown> = {}) {
    const n = ++this.sequence;
    return { _id: this.objectId(`user-${n}`), email: `user-${n}@example.test`, displayName: `Test User ${n}`, status: 'active', ...overrides };
  }

  workspace(overrides: Record<string, unknown> = {}) {
    const n = ++this.sequence;
    return { _id: this.objectId(`workspace-${n}`), name: `Workspace ${n}`, slug: `workspace-${n}`, status: 'active', ...overrides };
  }

  contact(workspaceId: string, overrides: Record<string, unknown> = {}) {
    const n = ++this.sequence;
    return { _id: this.objectId(`contact-${n}`), workspaceId, firstName: `Contact${n}`, email: `contact-${n}@example.test`, version: 1, ...overrides };
  }

  lead(workspaceId: string, overrides: Record<string, unknown> = {}) {
    const n = ++this.sequence;
    return { _id: this.objectId(`lead-${n}`), workspaceId, title: `Lead ${n}`, status: 'new', version: 1, ...overrides };
  }

  deal(workspaceId: string, overrides: Record<string, unknown> = {}) {
    const n = ++this.sequence;
    return { _id: this.objectId(`deal-${n}`), workspaceId, title: `Deal ${n}`, value: 10_000, currency: 'USD', version: 1, ...overrides };
  }

  ragChunk(workspaceId: string, overrides: Record<string, unknown> = {}) {
    const n = ++this.sequence;
    const content = `Grounded fixture content ${n}`;
    return { _id: this.objectId(`chunk-${n}`), workspaceId, sourceId: this.objectId(`source-${n}`), documentId: this.objectId(`document-${n}`), content, contentHash: createHash('sha256').update(content).digest('hex'), status: 'active', accessControlGroups: [], ...overrides };
  }

  objectId(namespace: string): string { return createHash('sha256').update(`${this.seed}:${namespace}`).digest('hex').slice(0, 24); }
}
