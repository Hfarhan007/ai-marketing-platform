# Accidental data deletion runbook

Owner: `[Data recovery lead]`

1. Stop the deleting actor/job and preserve audit records, tenant scope, object/document IDs, version IDs, and deletion timestamps.
2. Confirm authorization for recovery and whether deletion was a privacy/compliance request. Never restore lawfully deleted data without privacy/legal approval.
3. MongoDB: restore PITR to an isolated cluster before the deletion, extract only approved records and relationships, validate tenant ownership/invariants, then import through an audited idempotent recovery tool.
4. Objects: retrieve the prior version from the source or replica and copy it to a new current version. Preserve checksums, metadata, ACLs, and the original version IDs.
5. Rebuild derived search/vector/cache state from authoritative restored data. Validate application behavior and notify affected parties.
