# Backup and disaster recovery

**Readiness status: UNVERIFIED.** These documents define the intended controls and procedures. Disaster recovery must not be described as complete, certified, or production-ready until an isolated restore drill has been executed, timed, validated, and approved using `restore-drill-record.md`. Configuration review, provider backup status, and successful backup jobs are not substitutes for a restore test.

## Objectives

| Capability                     |                                                  Target RPO |                             Target RTO | Recovery source                                                    | Accountable owner        |
| ------------------------------ | ----------------------------------------------------------: | -------------------------------------: | ------------------------------------------------------------------ | ------------------------ |
| MongoDB customer/business data |                                                   5 minutes | 2 hours; 8 hours for regional recovery | Atlas continuous backup and point-in-time restore                  | `[Database owner]`       |
| Uploaded and generated files   |                                                  15 minutes |                                4 hours | Versioned encrypted object storage and cross-region replica        | `[Storage owner]`        |
| Redis queues/cache/rate limits | 15 minutes for durable job intent; cache RPO not applicable |                                 1 hour | Managed Redis failover plus replay from MongoDB outbox/job records | `[Platform owner]`       |
| Terraform state                |                                                      1 hour |                                2 hours | Versioned encrypted remote-state bucket and audit trail            | `[Infrastructure owner]` |
| Runtime secrets                |                                      Last approved rotation |                                2 hours | Secret-manager versions plus break-glass recovery                  | `[Security owner]`       |
| Container/deployment artifacts |                              Zero after registry acceptance |                                 1 hour | Immutable digest, SBOM, signature, retained Helm revision          | `[Release owner]`        |
| Vector search indexes          |                                             Source-data RPO |                                4 hours | Rebuild from authoritative chunks and embeddings                   | `[Search owner]`         |

Targets are service objectives, not observed performance. Record actual recovery point and recovery time during every drill or incident. If the measured result misses a target, open corrective actions with owners and dates.

## Backup controls

### MongoDB Atlas

- Enable continuous cloud backup and point-in-time restore for every production cluster.
- Retain hourly recovery points for 48 hours, daily snapshots for 14 days, weekly snapshots for 8 weeks, and monthly snapshots for 12 months. Legal or contractual requirements may extend, never silently shorten, these periods.
- Use Atlas encryption at rest and TLS. If customer-managed keys are enabled, protect the key in a separate administrative boundary and test key recovery; deleting the key can make backups unusable.
- Alert on backup policy changes, snapshot failure/delay, continuous-backup lag, missing recovery points, and expiring encryption keys.
- Restore into an isolated, access-restricted project or cluster. Never test by overwriting production.

### Files and object storage

- Enable versioning, block public access, encrypt current versions and replicas, and protect production buckets from Terraform destruction.
- Retain noncurrent versions for at least 90 days; tier them after 30 and 60 days. Abort incomplete multipart uploads after 7 days.
- Replicate asynchronously to a second region/account. Disable delete-marker replication so a source deletion does not immediately erase the recovery copy.
- Monitor replication age, failed operations, destination encryption, lifecycle changes, and object-lock/key health where used.
- Recover accidental deletion by copying the selected prior version to a new current version, preserving evidence of the deleted and restored version IDs.

### Configuration, secrets, and artifacts

- Store Terraform state in a separate versioned, encrypted bucket with locking, access logging, MFA-protected break-glass access, and cross-account/cross-region recovery. Export a daily state inventory and test reading a previous version without applying it.
- Secret Manager must retain approved prior versions. Maintain offline, dual-controlled recovery material only for root/bootstrap credentials. Recovery rotates the credential; it does not simply re-enable a suspected compromised value.
- Retain immutable container digests, signatures, provenance, SBOMs, release manifests, and Helm history for at least 12 months. Keep the last three known-good production releases immediately deployable.

## Governance and communication

Incident commander: `[Primary role]`; deputy: `[Backup role]`; technical leads: `[Database]`, `[Platform]`, `[Security]`, `[Application]`; communications lead: `[Role]`; executive/customer liaison: `[Role]`. Replace every placeholder before production launch and review quarterly.

Open an incident channel and record timestamps in UTC. The incident commander assigns severity and cadence: SEV-1 every 30 minutes, SEV-2 every 60 minutes. Updates state impact, affected tenants/regions, mitigations, data-loss estimate, next action, owner, and next update time. Do not speculate or expose secrets. Security/legal/privacy owners approve externally reportable data-loss statements and regulatory notifications.

Run restore drills quarterly and after material architecture, region, encryption-key, backup-policy, or migration changes. Alternate full Atlas PITR, object-version recovery, regional failover, Terraform-state recovery, secrets rotation, and queue replay. Preserve drill evidence for audit.

## Runbooks

- [MongoDB outage](runbooks/mongodb-outage.md)
- [Redis outage](runbooks/redis-outage.md)
- [Queue backlog](runbooks/queue-backlog.md)
- [Corrupted deployment](runbooks/corrupted-deployment.md)
- [Integration outage](runbooks/integration-outage.md)
- [AI provider outage](runbooks/ai-provider-outage.md)
- [Lost credentials](runbooks/lost-credentials.md)
- [Accidental data deletion](runbooks/accidental-deletion.md)
- [Vector index corruption](runbooks/vector-index-corruption.md)
- [Regional outage](runbooks/regional-outage.md)
- [Restore drill record](restore-drill-record.md)
- [Post-incident review template](post-incident-review.md)
