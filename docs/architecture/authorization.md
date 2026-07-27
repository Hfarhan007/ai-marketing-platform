# Authorization and policy rules

Authentication, workspace isolation, and authorization are separate backend boundaries:

1. `AuthenticationGuard` establishes the trusted user and session.
2. `WorkspaceGuard` verifies an active membership and establishes the workspace context.
3. `PermissionGuard` resolves active roles for that exact membership and workspace.

Controllers use `@RequirePermissions(...)` for all required permissions or
`@RequireAnyPermission(...)` for an explicit alternative set. Frontend permission state is never
accepted as authorization evidence.

## Roles

- System roles have `scope=system`, no workspace, and are immutable.
- Custom roles have `scope=workspace` and a mandatory workspace.
- Membership `roleIds` are direct assignments.
- Revoked roles and roles belonging to another workspace are excluded in the repository query.
- Role inheritance is intentionally not implemented. This avoids cycles, hidden privilege
  escalation, and ambiguous revocation behavior.
- Only immutable system roles may activate the narrowly allowed `admin.*` wildcard. It expands only
  to the `admin.` namespace and never grants unrelated workspace permissions.

## Policy and ownership

`PolicyService` combines direct permissions and known permission groups into an immutable ability
context. Ownership-sensitive repositories/services must call `assertOwnership` with the resource
owner and, when appropriate, an explicit management permission.

Resolved permissions are cached in Redis by workspace and membership. Role or assignment mutations
must publish a `PermissionInvalidatedEvent`; the listener deletes the affected membership key or
scans only that workspace's permission-key namespace.

## Administrative boundaries

Platform administrators do not bypass workspace membership or permission checks. Platform-wide
operations require the separate `@PlatformAdminOperation()` marker. Permission-protected decisions
are persisted in `privileged_access_audit`, including denials.
