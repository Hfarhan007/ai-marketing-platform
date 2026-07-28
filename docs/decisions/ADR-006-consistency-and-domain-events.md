# ADR-006: Transactional boundaries and consistency

Status: Accepted

## Decision

MongoDB transactions are limited to operations whose invariants span multiple documents in one owning
domain. Transactional domain events are written with the changed state using an outbox-compatible event
record where losing the event would violate business behavior. BullMQ delivery is asynchronous and
consumers use workspace-scoped idempotency keys.

Strong consistency is required for:

- refresh rotation, reuse detection, and session revocation;
- workspace ownership and membership authorization changes;
- permission and role assignment changes;
- contact merge and lead conversion;
- appointment conflict checks plus reservation;
- deal close transitions that update related sales records;
- workflow publication/version immutability and run concurrency claims;
- campaign cancellation versus delivery claims;
- subscription state transitions and usage-limit claims;
- webhook signature, replay, and idempotency claims.

Eventual consistency is acceptable for:

- search indexes and Atlas Vector Search embeddings;
- analytics, counters, dashboards, and usage snapshots;
- email, SMS, WhatsApp, notifications, and provider delivery status;
- campaign delivery metrics;
- workflow side effects after a run/step has been durably claimed;
- file processing, malware scanning, document ingestion, and orphan cleanup;
- integration synchronization and provider-health observations;
- audit read models, provided the originating privileged write is already durable.

## Failure handling

Application services commit only their owning domain. Integration events carry event, correlation,
causation, workspace, type, and schema-version identifiers. Consumers retry with bounded exponential
backoff, move exhausted jobs to a dead-letter queue, and do not treat queue delivery as exactly-once.
Compensation is explicit when a remote provider succeeds after the local request times out.
