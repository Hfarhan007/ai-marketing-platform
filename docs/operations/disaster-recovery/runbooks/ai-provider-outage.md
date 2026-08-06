# AI provider outage runbook

Owner: `[AI platform lead]`

Identify provider/model/region, affected features, error and latency changes, quotas, safety dependencies, and data-residency restrictions. Open circuit breakers and preserve request status without logging sensitive prompts. Route only to policy-approved compatible models with equivalent privacy and safety controls; otherwise return an explicit temporary-unavailable or insufficient-information response. Do not silently change grounding, moderation, tool, or retention policy. Canary recovery, compare contract/safety/groundedness metrics, and release traffic progressively within budget and quota limits.
