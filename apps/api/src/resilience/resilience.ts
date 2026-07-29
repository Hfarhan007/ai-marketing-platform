import { ServiceUnavailableException } from '@nestjs/common';
import type { Queue } from 'bullmq';
import type { Redis } from 'ioredis';

export class RetryBudget {
  private tokens: number;
  private lastRefill = Date.now();
  constructor(
    private readonly capacity: number,
    private readonly refillPerSecond: number,
  ) {
    this.tokens = capacity;
  }
  tryConsume(now = Date.now()) {
    const elapsed = Math.max(0, now - this.lastRefill);
    this.tokens = Math.min(this.capacity, this.tokens + (elapsed / 1_000) * this.refillPerSecond);
    this.lastRefill = now;
    if (this.tokens < 1) return false;
    this.tokens -= 1;
    return true;
  }
  remaining() {
    return Math.floor(this.tokens);
  }
}

export class CircuitBreaker {
  private failures = 0;
  private openedAt = 0;
  private state: 'closed' | 'open' | 'half_open' = 'closed';
  constructor(
    private readonly failureThreshold = 5,
    private readonly resetAfterMs = 30_000,
    private readonly requestTimeoutMs = 10_000,
  ) {}
  async execute<T>(operation: (signal: AbortSignal) => Promise<T>, now = Date.now()): Promise<T> {
    if (this.state === 'open') {
      if (now - this.openedAt < this.resetAfterMs)
        throw new ServiceUnavailableException('Provider circuit is open');
      this.state = 'half_open';
    }
    const controller = new AbortController();
    let rejectTimeout!: (reason: Error) => void;
    const timeout = new Promise<never>((_resolve, reject) => {
      rejectTimeout = reject;
    });
    const timer = setTimeout(() => {
      controller.abort();
      rejectTimeout(new Error('Provider request timed out'));
    }, this.requestTimeoutMs);
    try {
      const result = await Promise.race([operation(controller.signal), timeout]);
      this.failures = 0;
      this.state = 'closed';
      return result;
    } catch (error) {
      this.failures += 1;
      if (this.state === 'half_open' || this.failures >= this.failureThreshold) {
        this.state = 'open';
        this.openedAt = now;
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
  status() {
    return { state: this.state, failures: this.failures };
  }
}

export class CacheAside {
  constructor(private readonly redis: Redis) {}
  async get<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
    try {
      const cached = await this.redis.get(key);
      if (cached !== null) return JSON.parse(cached) as T;
    } catch {
      // Redis is an optimization. Degrade to the authoritative store.
    }
    const value = await loader();
    try {
      await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
      // Preserve availability when Redis is unavailable.
    }
    return value;
  }
  async invalidate(...keys: string[]) {
    if (!keys.length) return;
    await this.redis.del(...keys).catch(() => 0);
  }
}

export async function bulkWriteInBatches<T>(
  model: {
    bulkWrite(
      operations: readonly T[],
      options: { ordered: false },
    ): Promise<{ modifiedCount: number; upsertedCount: number; insertedCount: number }>;
  },
  operations: readonly T[],
  batchSize = 500,
) {
  if (batchSize < 1 || batchSize > 1_000) throw new Error('Bulk batch size must be 1-1000');
  let affected = 0;
  for (let offset = 0; offset < operations.length; offset += batchSize) {
    const result = await model.bulkWrite(operations.slice(offset, offset + batchSize), {
      ordered: false,
    });
    affected += result.modifiedCount + result.upsertedCount + result.insertedCount;
  }
  return affected;
}

export class QueueAdmissionControl {
  constructor(
    private readonly maxBacklog = 50_000,
    private readonly maxDelayMs = 300_000,
  ) {}
  async assertCapacity(queue: Queue, oldestTimestamp?: number) {
    const counts = await queue.getJobCounts('waiting', 'delayed', 'active');
    const backlog = (counts.waiting ?? 0) + (counts.delayed ?? 0);
    const delay = oldestTimestamp ? Date.now() - oldestTimestamp : 0;
    if (backlog >= this.maxBacklog || delay >= this.maxDelayMs)
      throw new ServiceUnavailableException('Queue is saturated; retry later');
    return { backlog, delay };
  }
  options(priority: 'critical' | 'high' | 'normal' | 'bulk') {
    return { priority: { critical: 1, high: 5, normal: 10, bulk: 20 }[priority] };
  }
}

export class ConcurrencyGate {
  private active = 0;
  constructor(private readonly limit: number) {}
  async run<T>(operation: () => Promise<T>) {
    if (this.active >= this.limit)
      throw new ServiceUnavailableException('Concurrency limit reached');
    this.active += 1;
    try {
      return await operation();
    } finally {
      this.active -= 1;
    }
  }
}
