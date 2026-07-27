# Tenant isolation

The API uses shared MongoDB collections. Tenant-owned documents must contain a required
`workspaceId`; creating a collection per workspace is prohibited.

## Request boundary

- Tenant routes use `@RequireWorkspace()` and require a valid `x-workspace-id` header.
- Authentication must populate `request.principal` with the trusted user identifier.
- `WorkspaceGuard` verifies both an active workspace and an active membership before creating the
  immutable request workspace context.
- Platform administrators do not bypass tenant membership checks. Platform-wide routes must use
  `@PlatformAdminOperation()` and are separately checked by `PlatformAdminGuard`.
- Request DTOs never accept `workspaceId`. Global whitelist validation rejects attempts to provide
  it.

## Persistence boundary

- Tenant repositories extend `TenantAwareRepository`.
- Reads, updates, and deletes add the trusted workspace constraint inside the repository.
- Updates that set, unset, rename, or insert `workspaceId` are rejected.
- Tenant aggregations begin with a trusted workspace match. Cross-collection and output stages
  (`$lookup`, `$graphLookup`, `$unionWith`, `$out`, `$merge`) are prohibited by the generic helper;
  reviewed domain-specific repositories are required for such operations.
- Every tenant access index begins with `workspaceId`. Indexes are applied through the explicit
  index manager, never production `autoIndex`.

## Asynchronous and secondary data

- Cache keys use `tenant:<workspaceId>:...`.
- Queue payloads carry a validated `workspaceId`, actor, and idempotency key.
- Workspace audit events require `workspaceId`. Platform audit events require an explicit
  authorization reason.
- Consumers must rebuild workspace context from trusted job data and repeat authorization where
  the operation changes tenant data.

Any repository that accesses tenant-owned data without these constraints is a security defect.

See [authorization.md](authorization.md) for role, permission, ownership, and platform-admin rules.
