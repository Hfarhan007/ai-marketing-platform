import { describe, expect, it, vi } from 'vitest';
import { MongoConnection } from '../mongo/mongo.connection.js';
import { TransactionManagerService } from './transaction-manager.service.js';

describe('TransactionManagerService', () => {
  it('returns the operation result and always closes the session', async () => {
    const endSession = vi.fn().mockResolvedValue(undefined);
    const session = {
      withTransaction: vi.fn(async (callback: () => Promise<void>) => callback()),
      endSession,
    };
    const manager = new TransactionManagerService({
      native: { startSession: vi.fn().mockResolvedValue(session) },
    } as unknown as MongoConnection);

    await expect(manager.run(() => Promise.resolve('committed'))).resolves.toBe('committed');
    expect(endSession).toHaveBeenCalledOnce();
  });

  it('retries transient transaction failures with a fresh session', async () => {
    const transient = {
      hasErrorLabel: vi.fn((label: string) => label === 'TransientTransactionError'),
    };
    const failedSession = {
      withTransaction: vi.fn().mockRejectedValue(transient),
      endSession: vi.fn().mockResolvedValue(undefined),
    };
    const successfulSession = {
      withTransaction: vi.fn(async (callback: () => Promise<void>) => callback()),
      endSession: vi.fn().mockResolvedValue(undefined),
    };
    const startSession = vi
      .fn()
      .mockResolvedValueOnce(failedSession)
      .mockResolvedValueOnce(successfulSession);
    const manager = new TransactionManagerService({
      native: { startSession },
    } as unknown as MongoConnection);

    await expect(manager.run(() => Promise.resolve(42))).resolves.toBe(42);
    expect(startSession).toHaveBeenCalledTimes(2);
    expect(failedSession.endSession).toHaveBeenCalledOnce();
  });
});
