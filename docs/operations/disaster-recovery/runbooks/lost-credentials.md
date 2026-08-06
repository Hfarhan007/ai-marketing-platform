# Lost or compromised credentials runbook

Owner: `[Security incident lead]`

1. Treat unknown possession as compromise. Record credential identity and scope without copying its value into tickets or chat.
2. Revoke/disable it, block active sessions where applicable, inspect audit logs, and estimate exposure. Use dual-controlled break-glass identity if primary administration is unavailable.
3. Issue a new least-privilege credential, store it as a new secret-manager version, deploy references, and verify consumers before removing the old version.
4. Rotate dependent credentials and encryption material when compromise could enable derivation or retrieval. Do not rotate data-encryption keys without a tested re-encryption/recovery plan.
5. Validate API, workers, backups, replication, CI/CD, and monitoring. Preserve evidence and complete security notification obligations.
