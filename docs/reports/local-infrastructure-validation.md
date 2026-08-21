# Local infrastructure validation

Validation date: 2026-08-06  
Compose project: `ai-marketing-platform-dev`  
Scope: existing root `docker-compose.yml` and `docker/**` development assets

## Outcome

The local topology is structurally coherent and three concrete wiring issues were repaired: API health routes now use the tested `/api/v1/health/*` contract, the API Compose health check targets that contract, and API/web host ports are loopback-only safe development defaults. The Docker web command had already been repaired to forward Vite's host argument correctly.

Runtime container validation is **blocked**, not passed: the `docker` executable is not installed or not available on `PATH` on this host. Therefore no image was built, no Compose container was started, and no live MongoDB replica-set, Redis, API, worker, MinIO, Mailpit, health, or Swagger result is claimed.

## Repairs applied

| File | Repair |
|---|---|
| `apps/api/src/main.ts` | Removed the health-route exclusions from the global `api/v1` prefix. This aligns runtime with `test/health.e2e-spec.ts` and prevents an unprefixed duplicate route. |
| `docker-compose.yml` | Changed the API readiness probe to `http://localhost:3001/api/v1/health/ready`. |
| `docker-compose.yml` | Bound API and web host ports to `127.0.0.1` for safe local-only defaults. Internal container listeners remain on `0.0.0.0`. |
| `README.md`, `apps/api/README.md` | Corrected API and worker health endpoint documentation. |

No production credentials or secrets were added. Existing credentials are explicitly development-only defaults.

## Service topology review

Compose does not set `container_name`, which is intentional because fixed names prevent scaling and create cross-project collisions. With project name `ai-marketing-platform-dev`, normal Compose instance names are expected to follow `ai-marketing-platform-dev-<service>-1`.

| Service | Expected container | Host ports | Networks | Persistent volumes | Health/start ordering | Static result |
|---|---|---|---|---|---|---|
| MongoDB | `ai-marketing-platform-dev-mongodb-1` | `127.0.0.1:27017` | `backend` | `mongodb_data:/data/db` | Ping health; init waits for healthy server | configured |
| Mongo init | `ai-marketing-platform-dev-mongodb-init-1` | none | `backend` | read-only init script | runs after Mongo ping; exits only after primary election | configured |
| Redis | `ai-marketing-platform-dev-redis-1` | `127.0.0.1:6379` | `backend` | `redis_data:/data` plus read-only config | `redis-cli ping`; API/worker wait for healthy | configured |
| MinIO | `ai-marketing-platform-dev-minio-1` | `127.0.0.1:9000`, `9001` | `backend` | `minio_data:/data` | HTTP live health; bucket init waits for health | configured, runtime unverified |
| MinIO init | `ai-marketing-platform-dev-minio-init-1` | none | `backend` | read-only shell script | idempotently creates private bucket; API waits for completion | configured |
| Mailpit | `ai-marketing-platform-dev-mailpit-1` | `127.0.0.1:1025`, `8025` | `backend` | `mailpit_data:/data` | binary `readyz`; API waits for health | configured, runtime unverified |
| API | `ai-marketing-platform-dev-api-1` | `127.0.0.1:3001` | `frontend`, `backend` | source bind, dependency volumes, `api_uploads` | waits for Mongo init, Redis, MinIO init, Mailpit; readiness checks Mongo and Redis | repaired, runtime blocked |
| Worker | `ai-marketing-platform-dev-worker-1` | `127.0.0.1:3002` | `backend` | source bind and dependency volumes | waits for Mongo init and Redis; readiness checks both connections | configured, runtime blocked |
| Web | `ai-marketing-platform-dev-web-1` | `127.0.0.1:5173` | `frontend` | source bind and dependency volumes | waits for healthy API, then HTTP root health | configured, runtime blocked |

The optional admin-profile services remain loopback-only: Mongo Express on `8081` and Redis Commander on `8082`.

## Environment review

| Concern | Value/evidence | Result |
|---|---|---|
| API MongoDB | `mongodb://mongodb:27017/ai_marketing_development?replicaSet=rs0` | correct Compose DNS and replica-set name |
| Worker MongoDB | same internal Mongo URI and replica-set name | correct |
| API/worker Redis | `redis://redis:6379` | correct Compose DNS |
| API listener | `HOST=0.0.0.0`, `PORT=3001` | correct inside container; host binding is loopback-only |
| Worker health listener | `WORKER_PORT=3002` | matches Compose port/probe |
| Frontend API URL | `http://localhost:3001/api/v1` | correct browser-visible URL; intentionally not Docker service DNS |
| CORS | `http://localhost:5173` | matches browser origin |
| MinIO API endpoint | `http://minio:9000` | correct container-to-container endpoint |
| MinIO browser URL | `http://localhost:9000/amp-development` | correct host-visible development URL |
| Authentication | explicitly development-only token/encryption defaults; secure cookies disabled | safe only for local development; environment validation rejects these in production |
| AI | provider disabled; optional Ollama URL points to host gateway | safe development default |

## MongoDB replica-set initialization

`docker/mongodb/init-replica-set.js` is idempotent: it accepts an existing replica set, otherwise initiates `rs0` with member host `mongodb:27017`, then polls for `myState === 1` for up to 60 seconds. API and worker depend on `mongodb-init` completing successfully, not merely on Mongo's initial ping. This is the correct transaction-capable startup dependency model.

Runtime election and transaction capability were not verified because containers could not be started.

## Redis and application readiness

- Redis uses AOF plus snapshots, `noeviction`, a persistent `/data` volume, and a `redis-cli ping` health check.
- API readiness invokes both MongoDB admin ping and Redis ping through the Nest health indicators.
- Worker connects Redis first, then MongoDB, registers workers only after both connections succeed, and exposes readiness based on both connection states.
- API and worker implement graceful signal/shutdown paths and Compose supplies stop grace periods of 30 and 45 seconds respectively.
- Web waits for API readiness, so it cannot report healthy before its backend dependencies are ready.

## Route verification

The existing API health E2E test was run after the prefix repair:

```text
pnpm --filter @repo/api exec vitest run test/health.e2e-spec.ts --config vitest.e2e.config.ts
PASS: 1 file, 2 tests
```

This proves `/api/v1/health/live` is mounted and `/health/live` is not exposed as an unintended duplicate in the test application. It does not substitute for a live dependency readiness test. Swagger remains configured at `/api/docs`.

## Actual command results

| Command | Result | Actual output summary |
|---|---|---|
| `docker compose config` | BLOCKED | exit 1: `docker` is not recognized |
| `docker compose build` | BLOCKED | exit 1: `docker` is not recognized |
| `docker compose up -d` | BLOCKED | exit 1: `docker` is not recognized |
| `docker compose ps` | BLOCKED | exit 1: `docker` is not recognized |
| `docker compose logs --tail=200` | BLOCKED | exit 1: `docker` is not recognized |
| `GET /api/v1/health/live` | BLOCKED | unable to connect to `127.0.0.1:3001`; no API container/process |
| `GET /api/v1/health/ready` | BLOCKED | unable to connect to `127.0.0.1:3001`; no API container/process |
| `GET /api/docs` | BLOCKED | unable to connect to `127.0.0.1:3001`; no API container/process |
| Health route E2E | PASS | 2/2 tests passed |

## Remaining failures and required rerun

1. Install/start Docker Desktop or Docker Engine with Compose v2 and ensure `docker version` succeeds.
2. Rerun the five requested Compose commands. Image availability, Dockerfile execution, Compose interpolation and engine behavior remain unverified.
3. Confirm `mongodb-init` exits zero and inspect `rs.status()` for a primary.
4. Confirm Redis reports `PONG`, API and worker become healthy, and all required services show the expected project-derived names.
5. Execute the three live HTTP probes and record status/body. Expected results are liveness `200`, readiness `200` only after MongoDB and Redis are healthy, and Swagger UI `200` (or its normal redirect followed by `200`).
6. Inspect the requested 200 log lines for restart loops, dependency timeouts, replica-set hostname errors, rejected Redis connections, MinIO initialization failures and graceful shutdown behavior.

Until that rerun succeeds, local infrastructure is repaired statically but **not operationally validated**.
