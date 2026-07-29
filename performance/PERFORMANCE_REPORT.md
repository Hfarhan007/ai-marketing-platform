# Backend performance and resilience report

## Status

Functional, type, lint, build, and resilience tests are executed in CI/local checks. The k6 workload
is provided but was **not executed** during implementation because no running, seeded production-like
API, MongoDB, Redis, or k6 binary was available. Therefore none of the latency or throughput targets
below are claimed as achieved.

## Target service-level objectives

| Measurement | Target |
|---|---:|
| Overall p50 latency | < 100 ms |
| Overall p95 latency | < 300 ms |
| Overall p99 latency | < 750 ms |
| Sustained throughput | >= 400 requests/second per API instance |
| Error rate | < 1% |
| Queue p95 delay | < 5 seconds interactive; < 60 seconds bulk |
| Process RSS | < 1 GiB per API or worker instance |
| Mongo pool saturation | < 80% sustained, < 95% peak |

Hot-path p95 targets are encoded as k6 thresholds: contact search 250 ms, deal pipeline 250 ms,
inbox pagination 200 ms, workflow triggering 300 ms, campaign scheduling 350 ms, appointment
conflict checks 200 ms, AI usage recording 200 ms, and RAG retrieval 500 ms.

## Capacity assumptions

- MongoDB is a three-node replica set with indexes deployed, working set in memory, storage latency
  below 2 ms, and database CPU below 65% before a run. Results are invalid if CPU exceeds 80%.
- Each API instance has 2 vCPU and 2 GiB memory, a Mongo pool of 2–20 connections, at most four
  simultaneous connection establishments, and a two-second pool wait limit.
- Redis is in the same region with p95 command latency below 5 ms.
- Workers use a 1–10 Mongo connection pool. Queue and workspace concurrency limits remain enabled.

## Workload

Run:

```sh
BASE_URL=https://test.example/api/v1 \
WORKSPACE_ID=<seeded-workspace> ACCESS_TOKEN=<token> \
PIPELINE_ID=<id> CONVERSATION_ID=<id> WORKFLOW_ID=<id> \
CAMPAIGN_ID=<id> STAFF_ID=<id> \
k6 run performance/k6/backend-hot-paths.js
```

Capture k6 output, Mongo CPU and connection metrics, Redis latency, process RSS, BullMQ queue delay,
and pool checkout wait. Compare all values with the table above; do not accept a run with missing
infrastructure telemetry.

## Implemented controls

- Bounded Mongo pools with max-connecting, idle eviction, compressed transport, and checkout timeout.
- Redis ready checks, bounded API command retries, reconnect backoff, command deadlines, and graceful
  cache-aside degradation.
- Batched unordered Mongo bulk writes and existing cursor streaming for exports and retained events.
- Provider circuit breaker, abort timeout, retry token budget, concurrency gate, and distributed locks.
- Queue backlog admission, priority mapping, BullMQ concurrency/limiters, and dead-letter handling.
- HTTP request socket deadlines, in-flight limits, event-loop-lag load shedding, and `Retry-After`.

## Failure coverage

- Redis unavailable and partial network failure: cache-aside falls back to the authoritative loader.
- Queue backlog: admission control rejects new work with 503.
- Provider timeout: timeout opens the circuit and blocks calls until a half-open probe.
- Retry storms and concurrency exhaustion: retry budgets and concurrency gates reject excess work.
- Duplicate events: existing inbox/outbox unique keys and integration tests.
- Worker crash: durable BullMQ jobs, stalled-job recovery, idempotency guard, and dead-letter tests.
- Mongo unavailable: bounded server selection/pool wait fails requests instead of hanging; a unit
  failure test verifies readiness reports unhealthy. A live fault-injection run remains required to
  measure recovery time.
