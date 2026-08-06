# Queue backlog runbook

Owner: `[Queue operations lead]`

Capture depth and oldest age per queue, active/stalled/failed/delayed counts, arrival/completion rates, poison payload signatures, worker concurrency, Redis saturation, database capacity, and downstream quotas. Quarantine poison jobs without deleting their evidence. Prioritize interactive and contractual workloads, then scale consumers only within all downstream limits. Use exponential retry and circuit breakers rather than synchronized retry storms. Drain in cohorts, watch duplicate rate and oldest age, and maintain an exported manifest before any purge. Close only when every durable intent is completed, cancelled, quarantined, or explicitly requeued.
