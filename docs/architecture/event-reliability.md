# Transactional event reliability

Business state and its `outbox_events` record are committed in the same replica-set transaction.
Application services do not publish directly to provider queues inside that transaction. A BullMQ
poller claims committed records, publishes them using `eventId` as the job identifier, and marks them
processed. A crash after commit leaves a pending row; a crash after queue insertion is harmless because
the BullMQ job ID and downstream inbox claim are idempotent.

Consumers claim `(consumerName, eventId)` in `inbox_events` before running a handler. Duplicate delivery
does not invoke the handler. Failures receive exponential backoff and are recorded in
`event_processing_failures`; the tenth failure is quarantined. Platform administrators can replay an
event using `POST /api/v1/admin/events/:eventId/replay`.

Correlation and causation identifiers are copied unchanged through outbox records and BullMQ jobs.
Sensitive keys are recursively redacted before MongoDB persistence. Message bodies are represented by
identifiers and content type rather than copied into integration events.

Processed outbox records expire after 30 days and processed inbox claims after 90 days. Failure archives
expire after one year. Quarantined events remain until explicit replay or archival. Production archival
jobs should export records to immutable object storage before setting `archivedAt`.

`GET /api/v1/admin/events/metrics` reports pending, delayed, failed, and quarantined event counts.
