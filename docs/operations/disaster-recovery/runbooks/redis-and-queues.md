# Redis outage and queue backlog runbook

Owner: `[Platform/queue lead]` | Escalation: `[Managed Redis support]`

1. Declare impact and capture Redis failover state, memory/CPU/connections, queue depth, oldest-job age, active/stalled/failed counts, worker concurrency, and downstream rate limits.
2. For Redis outage, allow managed Multi-AZ failover; pause producers that cannot persist durable intent. Do not treat cache loss as business-data loss. Authentication/rate-limit sessions may reset according to security policy.
3. After recovery, verify TLS/auth, BullMQ metadata, delayed jobs, repeatable jobs, and locks. Reconcile durable intent from MongoDB outbox/job records; replay with stable idempotency keys.
4. For backlog without outage, identify the constrained queue and cause. Stop poison jobs, quarantine malformed payloads, and scale only within database/provider quotas. Prioritize contractual/interactive jobs over bulk work.
5. Drain gradually while watching failure rate, oldest age, Redis saturation, MongoDB load, and third-party throttling. Never purge a queue without an exported manifest and incident approval.
6. Confirm all durable intents are completed, cancelled, quarantined, or explicitly requeued. Record lost cache effects separately from durable job recovery.

Rollback trigger: duplicate side effects, downstream throttling, rising failure rate, or database saturation. Reduce concurrency and stop replay.
