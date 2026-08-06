# Corrupted deployment runbook

Owner: `[Release incident lead]`

1. Stop promotion and capture image digests, Helm revisions, migration job output, configuration/secret versions, error rates, and affected endpoints.
2. Decide whether corruption is application-only or includes an irreversible schema/data migration. For application-only failures, use the protected rollback workflow with known-good revisions.
3. If a database migration ran, verify backward compatibility before rollback. Use a reviewed forward fix when the old binary cannot safely read the new schema.
4. Run readiness and business smoke tests, verify queue consumers and scheduled jobs, and compare error/latency to the pre-deployment baseline.
5. Keep the bad digest blocked from promotion and retain it, its SBOM, logs, and provenance for investigation.
