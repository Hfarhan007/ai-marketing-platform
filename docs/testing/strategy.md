# Backend testing strategy

Vitest is the only backend test runner. Tests are separated by runtime cost and boundary:

- `pnpm --filter @repo/api test` runs deterministic unit, controller, authorization, queue-policy, webhook, AI, and RAG tests without external services.
- `pnpm --filter @repo/api test:integration` runs repository/service tests. It uses `mongodb-memory-server` for normal persistence and a single-node replica set for transactional behavior. `MONGODB_INTEGRATION_URI` can point at the Docker replica set for production-binary validation.
- `pnpm --filter @repo/api test:e2e` uses Nest testing modules and Supertest at the HTTP boundary.
- `pnpm --filter @repo/api test:contracts` validates provider adapters against the shared AI contract.
- `pnpm --filter @repo/api test:all` runs every backend layer.

The Docker services in `docker/test-infrastructure.compose.yml` provide MongoDB 8 as a replica set and Redis 7.4. CI should start them, wait for health, set `MONGODB_INTEGRATION_URI=mongodb://localhost:27018/test?replicaSet=rs0` and `REDIS_TEST_URL=redis://localhost:6380`, run `test:all`, then tear the project down. Testcontainers helpers are available for suites that require per-run process isolation. Set `RUN_MEMORY_MONGO=true` to use `mongodb-memory-server` locally instead; its first run downloads a MongoDB binary and is intentionally opt-in. Never point test configuration at a shared or production database.

Factories under `test/support` are seeded and deterministic. Every persisted workspace-owned fixture must receive an explicit `workspaceId`; tests should create at least two tenants whenever authorization or repository filtering is involved. Redis suites use a unique database and key prefix and must flush only their allocated database.

## Required behavioral coverage

Tests should assert state transitions, persisted records, emitted jobs/events, permissions, idempotency, and observable HTTP responses. Calling a method or checking that a controller exists is not meaningful coverage.

Critical release journeys are registration/login, workspace creation and invitation, contact creation, lead conversion, deal movement, task creation, appointment booking, inbox receipt, workflow creation/execution, campaign creation, knowledge ingestion/RAG querying, agent execution, billing enforcement, and privacy deletion. Each journey must cover its success path, invalid input, unauthorized role, foreign tenant, and important retry/idempotency behavior. Existing domain suites cover their policies and state machines; HTTP journeys belong in `test/**/*.e2e-spec.ts`, while database and transaction assertions belong in integration suites.

Provider contract tests must use deterministic fake providers in normal CI. Live-provider smoke tests are opt-in, use dedicated credentials and budgets, and must never be required for pull requests. Webhook suites sign the exact raw body and test invalid signatures, stale timestamps, replay, and duplicate delivery. Queue suites assert payload tenancy, retry/backoff, idempotency, cancellation, and dead-letter behavior.
