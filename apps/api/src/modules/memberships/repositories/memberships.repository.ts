import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types, type Model } from 'mongoose';
import { TenantAwareRepository } from '../../../common/repositories/tenant-aware.repository.js';
import { tenantFilter } from '../../../common/utils/tenant-query.helper.js';
import { Membership, MembershipStatus } from '../schemas/membership.schema.js';

@Injectable()
export class MembershipsRepository extends TenantAwareRepository<Membership> {
  constructor(@InjectModel(Membership.name) memberships: Model<Membership>) {
    super(memberships);
  }

  findActiveMembership(workspaceId: string, userId: string): Promise<Membership | null> {
    if (!Types.ObjectId.isValid(userId)) return Promise.resolve(null);
    return this.model
      .findOne(
        tenantFilter(workspaceId, {
          userId: new Types.ObjectId(userId),
          status: MembershipStatus.Active,
        }),
      )
      .lean<Membership>()
      .exec();
  }

  async acceptInvite(userId: string, inviteTokenHash: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(userId)) return false;
    const result = await this.model.updateOne(
      {
        userId: new Types.ObjectId(userId),
        status: MembershipStatus.Invited,
        inviteTokenHash,
        inviteExpiresAt: { $gt: new Date() },
      },
      {
        $set: { status: MembershipStatus.Active, joinedAt: new Date() },
        $unset: { inviteTokenHash: 1, inviteExpiresAt: 1 },
      },
    );
    return result.modifiedCount === 1;
  }

  async assignRoles(
    workspaceId: string,
    membershipId: string,
    roleIds: readonly string[],
  ): Promise<boolean> {
    if (!Types.ObjectId.isValid(membershipId) || !roleIds.every((id) => Types.ObjectId.isValid(id))) {
      return false;
    }
    const membership = await this.updateOne(
      workspaceId,
      { _id: new Types.ObjectId(membershipId), status: MembershipStatus.Active },
      { $set: { roleIds: roleIds.map((id) => new Types.ObjectId(id)) } },
    );
    return membership !== null;
  }
}
