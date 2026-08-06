# Redis outage runbook

Owner: `[Platform lead]`

Declare the incident and capture managed failover state, connection/TLS/auth errors, memory and client saturation. Pause producers that cannot durably record intent, allow managed Multi-AZ failover, and avoid manual promotion unless the provider runbook requires it. After connectivity returns, validate locks, delayed/repeatable jobs and BullMQ metadata, then reconcile MongoDB outbox/job intent with stable idempotency keys. Cache and rate-limit loss is not restored as business data. Resume workers gradually and stop if duplicate effects or database saturation appears. See [queue backlog](queue-backlog.md) for controlled draining.
