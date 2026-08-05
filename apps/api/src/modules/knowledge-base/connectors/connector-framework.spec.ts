import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { describe, expect, it, vi } from 'vitest';
import { ConnectorUrlSecurityService } from './connector-url-security.service.js';
import { ConnectorSyncService } from './connector-sync.service.js';
import { FakeKnowledgeConnector } from './fake-knowledge.connector.js';
import { ConnectorCredentialVaultService } from './connector-credential-vault.service.js';

function setup() {
  const connector = new FakeKnowledgeConnector(),
    runId = new Types.ObjectId(),
    repository = {
      getConnection: vi
        .fn()
        .mockResolvedValue({
          type: 'manual_text',
          encryptedConfiguration: 'config',
          encryptedCredentials: 'credentials',
          checkpoint: 'old',
          allowedDomains: [],
        }),
      reserveRun: vi.fn().mockResolvedValue({ _id: runId, status: 'running' }),
      knownDocuments: vi.fn().mockResolvedValue([]),
      document: vi.fn(),
      upsertDocument: vi.fn().mockResolvedValue(new Types.ObjectId().toHexString()),
      checkpoint: vi.fn().mockResolvedValue({}),
      finishRun: vi.fn().mockResolvedValue({}),
      markDeleted: vi.fn().mockResolvedValue(null),
      deleteConnection: vi.fn(),
    },
    ingestion = {
      ingest: vi.fn().mockResolvedValue({ status: 'completed' }),
      deleteSource: vi.fn().mockResolvedValue({}),
    },
    urlSecurity = { assertAllowed: vi.fn().mockResolvedValue(new URL('https://example.test')) },
    service = new ConnectorSyncService(
      repository as never,
      { get: () => connector } as never,
      { open: () => ({ documents: [] }) } as never,
      ingestion as never,
      urlSecurity as never,
    );
  return { connector, repository, ingestion, service };
}
describe('knowledge connector framework', () => {
  it('blocks private, link-local, non-HTTPS, and non-allowlisted connector URLs', async () => {
    const privateDns = new ConnectorUrlSecurityService(() =>
      Promise.resolve([{ address: '127.0.0.1' }]),
    );
    await expect(
      privateDns.assertAllowed('https://docs.example.test/a', ['example.test']),
    ).rejects.toBeInstanceOf(BadRequestException);
    const publicDns = new ConnectorUrlSecurityService(() =>
      Promise.resolve([{ address: '203.0.113.10' }]),
    );
    await expect(
      publicDns.assertAllowed('http://docs.example.test/a', ['example.test']),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      publicDns.assertAllowed('https://evil.test/a', ['example.test']),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      publicDns.assertAllowed('https://docs.example.test/a', ['example.test']),
    ).resolves.toBeInstanceOf(URL);
  });
  it('performs incremental sync, resumes checkpoints, skips revisions, detects deletions, and audits retries', async () => {
    const { connector, repository, ingestion, service } = setup();
    connector.failures = 1;
    connector.pages = [
      {
        documents: [
          { externalId: 'same', locator: 'same', revision: 'r1' },
          { externalId: 'changed', locator: 'changed', revision: 'r2' },
        ],
        checkpoint: 'next',
        complete: true,
      },
    ];
    connector.contents.set('changed', 'new content');
    repository.knownDocuments.mockResolvedValue([
      { externalId: 'same', revision: 'r1' },
      { externalId: 'gone', revision: 'old', sourceId: new Types.ObjectId() },
    ]);
    repository.markDeleted.mockResolvedValue({ sourceId: new Types.ObjectId() });
    await expect(
      service.sync({
        workspaceId: new Types.ObjectId().toHexString(),
        userId: new Types.ObjectId().toHexString(),
        connectionId: new Types.ObjectId().toHexString(),
        idempotencyKey: 'sync-1',
      }),
    ).resolves.toMatchObject({ fetched: 1, unchanged: 1, deleted: 1, retries: 1 });
    expect(ingestion.ingest).toHaveBeenCalledOnce();
    expect(ingestion.deleteSource).toHaveBeenCalledOnce();
    expect(connector.checkpoints).toEqual(['next']);
    expect(repository.checkpoint).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      'next',
    );
    expect(repository.finishRun).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ status: 'completed', retries: 1 }),
    );
  });
  it('returns completed idempotent runs without connector effects', async () => {
    const { connector, repository, service } = setup();
    repository.reserveRun.mockResolvedValue({ _id: new Types.ObjectId(), status: 'completed' });
    await expect(
      service.sync({
        workspaceId: new Types.ObjectId().toHexString(),
        userId: new Types.ObjectId().toHexString(),
        connectionId: new Types.ObjectId().toHexString(),
        idempotencyKey: 'same',
      }),
    ).resolves.toMatchObject({ duplicate: true });
    expect(connector.checkpoints).toHaveLength(0);
  });
  it('encrypts connector credentials without retaining plaintext', () => {
    const crypto = {
        encrypt: (value: string) => `sealed:${Buffer.from(value).toString('base64')}`,
        decrypt: (value: string) => Buffer.from(value.slice(7), 'base64').toString(),
      },
      vault = new ConnectorCredentialVaultService(crypto as never),
      sealed = vault.seal({ token: 'secret-token' });
    expect(sealed).not.toContain('secret-token');
    expect(vault.open(sealed)).toEqual({ token: 'secret-token' });
  });
  it('enforces content-size limits before ingestion', async () => {
    const { connector, service } = setup();
    connector.pages = [
      {
        documents: [{ externalId: 'large', locator: 'large', revision: 'r1' }],
        checkpoint: null,
        complete: true,
      },
    ];
    connector.contents.set('large', 'x'.repeat(100));
    (service as unknown as { vault: { open: () => Record<string, unknown> } }).vault.open = () => ({
      maxContentBytes: 10,
    });
    await expect(
      service.sync({
        workspaceId: new Types.ObjectId().toHexString(),
        userId: new Types.ObjectId().toHexString(),
        connectionId: new Types.ObjectId().toHexString(),
        idempotencyKey: 'large',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
