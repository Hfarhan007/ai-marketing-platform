# Integration outage runbook

Owner: `[Integration lead]`

Identify provider, tenant scope, operation types, provider incident, signature/auth state, quotas, and retry amplification. Persist outbound intent and provider event IDs, open circuit breakers, continue signed webhook capture only when storage and replay are safe, and show delayed status to users. Never bypass webhook verification or use unapproved credentials. After recovery, validate the adapter contract with a canary tenant, replay idempotently within provider rate limits, and reconcile every operation as completed, duplicate, failed, or cancelled.
