# Restore drill record

Copy this file for each drill as `evidence/YYYY-MM-DD-<scenario>.md`. Do not mark DR verified unless evidence links are durable and reviewers sign off.

## Authorization and scope

- Drill ID / date (UTC):
- Scenario and environment:
- Incident commander / technical lead / observers:
- Approved change or ticket:
- Systems explicitly excluded:
- Target RPO / RTO:
- Safety controls confirming no production overwrite or outbound customer side effects:

## Recovery point and timing

- Failure/cutoff timestamp:
- Selected backup/snapshot/object/state/secret version:
- Last recoverable authoritative event timestamp:
- Drill started / recovery started / service validated / drill ended:
- Measured RPO:
- Measured RTO:

## Execution evidence

- Backup health and encryption/key-access evidence:
- Restore operation/provider job IDs:
- Isolated target identifiers:
- Commands or workflow runs (secret-free):
- Logs, screenshots, metrics, and audit-event links:
- Data counts, checksums, tenant isolation, referential-integrity results:
- Application/API/worker/queue/RAG smoke-test results:
- File version and replication validation:
- Terraform state read/version recovery validation:
- Secrets rotation/recovery validation:

## Outcome

- Result: `[pass | conditional pass | fail]`
- Data loss observed versus RPO:
- Recovery time versus RTO:
- Unresolved risks:
- Corrective action / owner / due date:
- Database owner approval:
- Security owner approval:
- Application owner approval:
- Incident/DR owner approval:

An incomplete, conditional, or failed record leaves DR status **UNVERIFIED**.
