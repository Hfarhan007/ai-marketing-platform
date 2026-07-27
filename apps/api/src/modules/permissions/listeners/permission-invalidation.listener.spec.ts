import { describe, expect, it, vi } from 'vitest';
import type { PermissionCacheService } from '../services/permission-cache.service.js';
import { PermissionEventsService } from '../services/permission-events.service.js';
import { PermissionInvalidationListener } from './permission-invalidation.listener.js';

describe('permission invalidation events', () => {
  it('invalidates the targeted workspace membership cache', async () => {
    const events = new PermissionEventsService();
    const cache = { invalidate: vi.fn().mockResolvedValue(undefined) };
    const listener = new PermissionInvalidationListener(
      events,
      cache as unknown as PermissionCacheService,
    );
    listener.onModuleInit();
    events.invalidate('workspace', 'membership');
    await vi.waitFor(() =>
      expect(cache.invalidate).toHaveBeenCalledWith('workspace', 'membership'),
    );
    listener.onApplicationShutdown();
  });
});
