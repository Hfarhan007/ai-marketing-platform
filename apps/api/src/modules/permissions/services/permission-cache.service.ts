import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../../../cache/redis.constants.js';
import type { Permission } from '../constants/permission.catalog.js';

@Injectable()
export class PermissionCacheService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async get(workspaceId: string, membershipId: string): Promise<string[] | null> {
    const value = await this.redis.get(this.key(workspaceId, membershipId));
    if (!value) return null;
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((item) => typeof item === 'string') ? parsed : null;
  }

  async set(
    workspaceId: string,
    membershipId: string,
    permissions: readonly (Permission | 'admin.*')[],
  ): Promise<void> {
    await this.redis.set(this.key(workspaceId, membershipId), JSON.stringify(permissions), 'EX', 300);
  }

  async invalidate(workspaceId: string, membershipId?: string): Promise<void> {
    if (membershipId) {
      await this.redis.del(this.key(workspaceId, membershipId));
      return;
    }
    let cursor = '0';
    do {
      const [next, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        `permissions:${workspaceId}:*`,
        'COUNT',
        100,
      );
      cursor = next;
      if (keys.length > 0) await this.redis.del(...keys);
    } while (cursor !== '0');
  }

  private key(workspaceId: string, membershipId: string): string {
    return `permissions:${workspaceId}:${membershipId}`;
  }
}
