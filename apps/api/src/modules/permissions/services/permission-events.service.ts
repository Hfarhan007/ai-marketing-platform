import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';
import { PermissionInvalidatedEvent } from '../events/permission-invalidated.event.js';

@Injectable()
export class PermissionEventsService {
  readonly events = new Subject<PermissionInvalidatedEvent>();

  invalidate(workspaceId: string, membershipId?: string): void {
    this.events.next(new PermissionInvalidatedEvent(workspaceId, membershipId));
  }
}
