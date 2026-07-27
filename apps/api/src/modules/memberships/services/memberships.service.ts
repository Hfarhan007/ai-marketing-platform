import { Inject, Injectable } from '@nestjs/common';
import type { WorkspaceRequestContext } from '../../../common/types/workspace-context.js';
import type { MembershipResponseDto } from '../dto/membership-response.dto.js';
import { mapMembershipResponse } from '../mappers/membership.mapper.js';
import { MembershipsRepository } from '../repositories/memberships.repository.js';
import { WorkspaceManagementPolicy } from '../../workspaces/policies/workspace-management.policy.js';

@Injectable()
export class MembershipsService {
  constructor(
    @Inject(MembershipsRepository) private readonly memberships: MembershipsRepository,
    @Inject(WorkspaceManagementPolicy) private readonly management: WorkspaceManagementPolicy,
  ) {}

  async list(context: WorkspaceRequestContext): Promise<MembershipResponseDto[]> {
    await this.management.authorize(context);
    const memberships = await this.memberships.findMany(context.workspaceId);
    return memberships.map(mapMembershipResponse);
  }
}
