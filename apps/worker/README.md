# Worker

Production BullMQ consumers for the platform's asynchronous workloads.

Configure `REDIS_URL` and `MONGODB_URI`, then run `pnpm --filter @repo/worker dev`.
Operational endpoints are served on `WORKER_PORT` (default `3002`):

- `GET /health/live`
- `GET /health/ready`
- `GET /metrics`

Every job must include a valid `workspaceId`, `correlationId`, and `idempotencyKey`.
External email, SMS, WhatsApp, AI, webhook-delivery, and notification processors are
safe mocks until provider-specific implementations are configured.
