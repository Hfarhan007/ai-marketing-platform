import { Injectable, type OnApplicationShutdown, type OnModuleInit } from '@nestjs/common';
import type { Subscription } from 'rxjs';
import { PermissionCacheService } from '../services/permission-cache.service.js';
import { PermissionEventsService } from '../services/permission-events.service.js';

@Injectable()
export class PermissionInvalidationListener implements OnModuleInit, OnApplicationShutdown {
  private subscription?: Subscription;

  constructor(
    private readonly events: PermissionEventsService,
    private readonly cache: PermissionCacheService,
  ) {}

  onModuleInit(): void {
    this.subscription = this.events.events.subscribe((event) => {
      void this.cache.invalidate(event.workspaceId, event.membershipId);
    });
  }

  onApplicationShutdown(): void {
    this.subscription?.unsubscribe();
  }
}
