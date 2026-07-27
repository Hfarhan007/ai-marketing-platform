import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import type { RequestWithWorkspaceContext } from '../types/workspace-context.js';
import { PlatformAdminGuard } from './platform-admin.guard.js';

function context(principal: RequestWithWorkspaceContext['principal']): ExecutionContext {
  return {
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
    switchToHttp: () => ({ getRequest: () => ({ headers: {}, principal }) }),
  } as unknown as ExecutionContext;
}

describe('PlatformAdminGuard', () => {
  it('rejects a normal user from an explicitly marked platform operation', () => {
    const guard = new PlatformAdminGuard({
      getAllAndOverride: vi.fn().mockReturnValue(true),
    } as unknown as Reflector);
    expect(() =>
      guard.canActivate(context({ userId: 'user', platformAdmin: false })),
    ).toThrow(ForbiddenException);
  });

  it('does not treat unmarked tenant routes as platform operations', () => {
    const guard = new PlatformAdminGuard({
      getAllAndOverride: vi.fn().mockReturnValue(false),
    } as unknown as Reflector);
    expect(guard.canActivate(context(undefined))).toBe(true);
  });
});
