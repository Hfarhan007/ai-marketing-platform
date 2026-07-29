import { ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import {
  CacheAside,
  CircuitBreaker,
  ConcurrencyGate,
  QueueAdmissionControl,
  RetryBudget,
} from './resilience.js';

describe('backend resilience controls', () => {
  it('opens a provider circuit after timeouts and probes after the reset interval', async () => {
    const breaker = new CircuitBreaker(2, 100, 5);
    const timeout = () =>
      breaker.execute(
        (signal) =>
          new Promise((_resolve, reject) =>
            signal.addEventListener('abort', () => reject(new Error('provider timeout'))),
          ),
        1_000,
      );
    await expect(timeout()).rejects.toThrow('provider timeout');
    await expect(timeout()).rejects.toThrow('provider timeout');
    await expect(breaker.execute(() => Promise.resolve('blocked'), 1_050)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    await expect(breaker.execute(() => Promise.resolve('recovered'), 1_101)).resolves.toBe(
      'recovered',
    );
  });

  it('degrades to Mongo when Redis is unavailable', async () => {
    const redis = {
      get: vi.fn().mockRejectedValue(new Error('redis unavailable')),
      set: vi.fn().mockRejectedValue(new Error('partial network failure')),
    };
    const loader = vi.fn().mockResolvedValue({ source: 'mongodb' });
    await expect(
      new CacheAside(redis as never).get('key', 30, loader),
    ).resolves.toEqual({ source: 'mongodb' });
    expect(loader).toHaveBeenCalledOnce();
  });

  it('rejects queue backlog and enforces queue priority', async () => {
    const queue = { getJobCounts: vi.fn().mockResolvedValue({ waiting: 100, delayed: 1, active: 2 }) };
    const admission = new QueueAdmissionControl(100, 60_000);
    await expect(admission.assertCapacity(queue as never)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(admission.options('critical').priority).toBeLessThan(
      admission.options('bulk').priority,
    );
  });

  it('caps retry storms and concurrent work', async () => {
    const budget = new RetryBudget(2, 0);
    expect([budget.tryConsume(), budget.tryConsume(), budget.tryConsume()]).toEqual([
      true,
      true,
      false,
    ]);
    const gate = new ConcurrencyGate(1);
    let release!: () => void;
    const first = gate.run(() => new Promise<void>((resolve) => (release = resolve)));
    await expect(gate.run(() => Promise.resolve())).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    release();
    await first;
  });
});
