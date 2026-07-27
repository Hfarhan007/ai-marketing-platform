import type { MembershipResponseDto } from '../dto/membership-response.dto.js';
import type { Membership } from '../schemas/membership.schema.js';

export function mapMembershipResponse(membership: Membership): MembershipResponseDto {
  return {
    id: membership._id.toString(),
    userId: membership.userId.toString(),
    roleIds: membership.roleIds.map((roleId) => roleId.toString()),
    status: membership.status,
    ...(membership.invitedBy ? { invitedBy: membership.invitedBy.toString() } : {}),
    ...(membership.joinedAt ? { joinedAt: membership.joinedAt.toISOString() } : {}),
    ...(membership.suspendedAt ? { suspendedAt: membership.suspendedAt.toISOString() } : {}),
  };
}
