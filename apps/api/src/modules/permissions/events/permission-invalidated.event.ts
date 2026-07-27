export class PermissionInvalidatedEvent {
  constructor(
    readonly workspaceId: string,
    readonly membershipId?: string,
  ) {}
}
