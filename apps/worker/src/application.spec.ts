import mongoose from 'mongoose';
import { describe, expect, it, vi } from 'vitest';
import { stopApplication } from './application.js';
describe('graceful shutdown', () => {
  it('stops ingress and workers before closing data connections', async () => {
    const order: string[] = [],
      resources = {
        logger: { info: vi.fn() },
        health: {
          close: vi.fn(() => {
            order.push('health');
            return Promise.resolve();
          }),
        },
        workers: {
          close: vi.fn(() => {
            order.push('workers');
            return Promise.resolve();
          }),
        },
        queues: {
          close: vi.fn(() => {
            order.push('queues');
            return Promise.resolve();
          }),
        },
        redis: {
          quit: vi.fn(() => {
            order.push('redis');
            return Promise.resolve('OK');
          }),
        },
      };
    vi.spyOn(mongoose, 'disconnect').mockImplementation(() => {
      order.push('mongo');
      return Promise.resolve();
    });
    await stopApplication(resources as never);
    expect(order).toEqual(['health', 'workers', 'queues', 'mongo', 'redis']);
  });
});
