# AI Marketing Platform

A production-minded pnpm and Turborepo monorepo for the AI Marketing Platform.

## Prerequisites

- Node.js 20+
- pnpm 10+
- Docker Desktop or Docker Engine with Compose v2 (for the full local stack)

## Getting started

```bash
pnpm install
pnpm dev
```

The web application runs at `http://localhost:5173`.

## Docker development stack

Start the complete environment with `pnpm docker:up`. Compose waits for the MongoDB replica set, Redis, MinIO bucket initialization, Mailpit, API, and worker health before the web application starts. Source code is bind-mounted for hot reload; dependencies and service data use named volumes.

| Service           | Address                                       | Notes                                                      |
| ----------------- | --------------------------------------------- | ---------------------------------------------------------- |
| Web               | http://localhost:5173                         | Vite development server                                    |
| API               | http://localhost:3001                         | Swagger `/api/docs`; readiness `/api/v1/health/ready`      |
| Worker            | http://localhost:3002                         | Readiness `/health/ready`                                  |
| MongoDB           | `mongodb://localhost:27017/?replicaSet=rs0`   | Loopback-only transaction-capable replica set              |
| Redis             | `redis://localhost:6379`                      | Loopback-only AOF and snapshot persistence                 |
| MinIO / console   | http://localhost:9000 / http://localhost:9001 | Private `amp-development` bucket initialized automatically |
| Mailpit SMTP / UI | `localhost:1025` / http://localhost:8025      | Development mail capture                                   |

Development-only Mongo Express and Redis Commander are opt-in:

```bash
docker compose --profile admin up -d
```

They bind to loopback at http://localhost:8081 and http://localhost:8082. Defaults in `docker/.env.example` are intentionally local-only. Copy overrides to the repository-root `.env` if needed; never reuse these credentials in production.

`pnpm docker:logs` follows logs and `pnpm docker:down` stops services while preserving data. `pnpm docker:reset` permanently deletes all local stack volumes and rebuilds. Compose stop grace periods allow the API and worker to close database and queue connections cleanly.

The API reaches MinIO as `minio:9000`. For browser-direct presigned uploads, add `127.0.0.1 minio` to the local hosts file so the signed hostname also resolves on the host.

## Commands

| Command             | Purpose                                 |
| ------------------- | --------------------------------------- |
| `pnpm dev`          | Start development tasks                 |
| `pnpm build`        | Build all packages and applications     |
| `pnpm lint`         | Lint all workspaces                     |
| `pnpm type-check`   | Run strict TypeScript checks            |
| `pnpm test`         | Run unit tests                          |
| `pnpm test:e2e`     | Run Playwright browser tests            |
| `pnpm docker:up`    | Build and start the healthy local stack |
| `pnpm docker:down`  | Stop the stack while preserving data    |
| `pnpm docker:logs`  | Follow recent logs for every service    |
| `pnpm docker:reset` | Delete local stack volumes and rebuild  |

See [docs/architecture/README.md](docs/architecture/README.md) for repository structure.

Production Kubernetes, Helm, Terraform, managed MongoDB Atlas, managed Redis, state-backend, and rollout guidance is in [infra/README.md](infra/README.md). Infrastructure templates are plan-only and are never applied automatically.

Enterprise GitHub Actions validation, image provenance, protected deployments, and rollback procedures are documented in [docs/operations/cicd.md](docs/operations/cicd.md).

Backup objectives, disaster-recovery controls, restore drills, incident runbooks, and post-incident review templates are documented in [docs/operations/disaster-recovery/README.md](docs/operations/disaster-recovery/README.md). DR remains unverified until a real isolated restore test is executed and approved.
