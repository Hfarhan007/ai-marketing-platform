import { BadRequestException, ForbiddenException, type ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { Types } from 'mongoose';
import { describe, expect, it, vi } from 'vitest';
import type { RequestWithWorkspaceContext } from '../types/workspace-context.js';
import type { MembershipsRepository } from '../../modules/memberships/repositories/memberships.repository.js';
import { MembershipStatus } from '../../modules/memberships/schemas/membership.schema.js';
import type { WorkspacesRepository } from '../../modules/workspaces/repositories/workspaces.repository.js';
import { WorkspaceStatus } from '../../modules/workspaces/schemas/workspace.schema.js';
import { WorkspaceGuard } from './workspace.guard.js';

const workspaceA = '507f1f77bcf86cd799439011';
const workspaceB = '507f1f77bcf86cd799439012';
const userId = '507f1f77bcf86cd799439013';

function executionContext(request: RequestWithWorkspaceContext): ExecutionContext {
  return {
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('WorkspaceGuard', () => {
  it('rejects horizontal privilege escalation to another workspace', async () => {
    const memberships = {
      findActiveMembership: vi.fn().mockResolvedValue(null),
    };
    const workspaces = {
      findActiveById: vi.fn().mockResolvedValue({
        _id: new Types.ObjectId(workspaceB),
        status: WorkspaceStatus.Active,
      }),
    };
    const guard = new WorkspaceGuard(
      { getAllAndOverride: vi.fn().mockReturnValue(true) } as unknown as Reflector,
      memberships as unknown as MembershipsRepository,
      workspaces as unknown as WorkspacesRepository,
    );
    const request: RequestWithWorkspaceContext = {
      headers: { 'x-workspace-id': workspaceB },
      principal: { userId, platformAdmin: false },
    };

    await expect(guard.canActivate(executionContext(request))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(memberships.findActiveMembership).toHaveBeenCalledWith(workspaceB, userId);
  });

  it('establishes context only from the verified membership', async () => {
    const membershipId = new Types.ObjectId();
    const roleId = new Types.ObjectId();
    const guard = new WorkspaceGuard(
      { getAllAndOverride: vi.fn().mockReturnValue(true) } as unknown as Reflector,
      {
        findActiveMembership: vi.fn().mockResolvedValue({
          _id: membershipId,
          roleIds: [roleId],
          status: MembershipStatus.Active,
        }),
      } as unknown as MembershipsRepository,
      {
        findActiveById: vi.fn().mockResolvedValue({
          _id: new Types.ObjectId(workspaceA),
          status: WorkspaceStatus.Active,
        }),
      } as unknown as WorkspacesRepository,
    );
    const request: RequestWithWorkspaceContext = {
      headers: { 'x-workspace-id': workspaceA },
      principal: { userId, platformAdmin: false },
    };

    await expect(guard.canActivate(executionContext(request))).resolves.toBe(true);
    expect(request.workspaceContext).toEqual({
      workspaceId: workspaceA,
      userId,
      membershipId: membershipId.toString(),
      roleIds: [roleId.toString()],
    });
  });

  it('rejects a missing or malformed workspace header', async () => {
    const guard = new WorkspaceGuard(
      { getAllAndOverride: vi.fn().mockReturnValue(true) } as unknown as Reflector,
      {} as MembershipsRepository,
      {} as WorkspacesRepository,
    );
    const request: RequestWithWorkspaceContext = {
      headers: { 'x-workspace-id': 'not-an-object-id' },
      principal: { userId, platformAdmin: true },
    };
    await expect(guard.canActivate(executionContext(request))).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects suspended members because no active membership can be resolved', async () => {
    const guard = new WorkspaceGuard(
      { getAllAndOverride: vi.fn().mockReturnValue(true) } as unknown as Reflector,
      { findActiveMembership: vi.fn().mockResolvedValue(null) } as unknown as MembershipsRepository,
      {
        findActiveById: vi.fn().mockResolvedValue({
          _id: new Types.ObjectId(workspaceA),
          status: WorkspaceStatus.Active,
        }),
      } as unknown as WorkspacesRepository,
    );
    const request: RequestWithWorkspaceContext = {
      headers: { 'x-workspace-id': workspaceA },
      principal: { userId, sessionId: '507f1f77bcf86cd799439014', platformAdmin: false },
    };
    await expect(guard.canActivate(executionContext(request))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
