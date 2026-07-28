import { describe, expect, it, vi } from 'vitest';
import { InboxRealtimeService } from './inbox-realtime.service.js';
describe('InboxRealtimeService', () => {
  it('isolates events using workspace-qualified conversation rooms', () => {
    const emit = vi.fn();
    const to = vi.fn().mockReturnValue({ emit });
    const service = new InboxRealtimeService();
    service.bind({ to } as never);
    service.conversation('workspace-a', 'conversation-1', 'message.created', { id: '1' });
    expect(to).toHaveBeenCalledWith('workspace:workspace-a:conversation:conversation-1');
    expect(to).not.toHaveBeenCalledWith('workspace:workspace-b:conversation:conversation-1');
  });
});
