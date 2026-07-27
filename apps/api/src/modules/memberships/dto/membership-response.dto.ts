export interface MembershipResponseDto {
  id: string;
  userId: string;
  roleIds: string[];
  status: string;
  invitedBy?: string;
  joinedAt?: string;
  suspendedAt?: string;
}
