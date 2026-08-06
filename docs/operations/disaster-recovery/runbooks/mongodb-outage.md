# MongoDB outage runbook

Owner: `[Database incident lead]` | Escalation: `[Atlas support plan/contact]`

1. Declare the incident, freeze migrations/index changes, capture Atlas event IDs, topology, backup lag, last confirmed recovery point, and application error rates.
2. Determine scope: transient election, cluster outage, network/private endpoint, credential/TLS failure, corruption, or regional loss. Do not restore over a healthy cluster to solve connectivity.
3. For election/network issues, verify Atlas status and private DNS/routes/security rules, then allow managed failover. Put write-heavy features into maintenance/read-only mode if retries threaten duplication.
4. For corruption or destructive writes, stop affected writers and queue consumers. Record the earliest bad-write time and choose a PITR timestamp before it. Preserve the original cluster for forensics.
5. Restore to a new isolated Atlas cluster. Validate encryption access, indexes, schema/migrations, tenant counts, critical invariants, sample hashes, newest acceptable event timestamp, and application smoke tests.
6. Obtain incident-commander and database-owner approval. Rotate connection credentials, switch through the secret manager, restart workloads gradually, and monitor errors/change streams/queue replay.
7. Record actual RPO/RTO and reconcile writes after the restore point through audited domain-specific replay. Never bulk replay without idempotency checks.

Rollback trigger: validation mismatch, missing tenants, excessive backup lag, or higher corruption in the restored cluster. Keep traffic on the last safe system and escalate to Atlas support.
