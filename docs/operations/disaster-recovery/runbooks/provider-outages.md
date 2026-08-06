# Integration and AI provider outage runbook

Owner: `[Integration/AI lead]`

1. Identify provider, region, affected operations, tenant scope, status-page incident, error class, latency, quota, and credential health. Disable retries that amplify a provider outage.
2. Integration outage: persist outbound intent, apply exponential backoff/circuit breakers, continue signed webhook ingestion when safe, and surface delayed status. Preserve provider event IDs for idempotent replay.
3. AI outage: route only to policy-approved compatible providers. Preserve model/version/data-region constraints; otherwise return an explicit temporary-unavailable response. Never silently downgrade safety or privacy policy.
4. On recovery, canary a small tenant/job cohort, validate signatures and response contracts, then drain backlog within rate limits.
5. Reconcile every queued operation as completed, duplicate, failed, or cancelled and notify affected customers according to severity.
