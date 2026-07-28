import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';
@Injectable()
export class InboxRealtimeService {
  private server?: Server;
  bind(server: Server): void {
    this.server = server;
  }
  workspace(workspaceId: string, event: string, payload: object): void {
    this.server?.to(`workspace:${workspaceId}`).emit(event, payload);
  }
  conversation(workspaceId: string, conversationId: string, event: string, payload: object): void {
    this.server?.to(`workspace:${workspaceId}:conversation:${conversationId}`).emit(event, payload);
  }
}
