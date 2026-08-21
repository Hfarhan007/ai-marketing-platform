# API

Production-oriented NestJS/Fastify API for the AI Marketing Platform.

## Local prerequisites

- MongoDB at `mongodb://localhost:27017`
- Redis at `redis://localhost:6379`

Copy `.env.example` to `.env`, then run `pnpm --filter @repo/api dev`.

## Local MongoDB replica set

Transactions require a replica set. Start the provided single-node development replica set and
Redis from the repository root:

```bash
docker compose -f docker/docker-compose.infrastructure.yml up -d
```

Use this local URI:

```text
MONGODB_URI=mongodb://localhost:27017/?replicaSet=rs0
```

The database name defaults to `<MONGODB_DATABASE_PREFIX>_<NODE_ENV>`, keeping development and test
data separate. Set `MONGODB_DATABASE` for an explicit database name. Atlas `mongodb+srv://` URIs are
supported.

Run controlled database operations with:

```bash
pnpm --filter @repo/api db:indexes
pnpm --filter @repo/api db:migrate
pnpm --filter @repo/api db:seed
```

Run real database integration tests against the local replica set:

```bash
MONGODB_INTEGRATION_URI="mongodb://localhost:27017/?replicaSet=rs0" \
  pnpm --filter @repo/api test:integration
```

The integration suite is skipped when `MONGODB_INTEGRATION_URI` is absent.

Index synchronization is explicit. Production never uses Mongoose `autoIndex`, never drops drifted
indexes automatically, and refuses the built-in development/test seed command. Repeatable
migrations rerun only when their checksum changes.

Endpoints:

- `GET /api/v1/health/live`
- `GET /api/v1/health/ready`
- Swagger UI at `/api/docs`
- Business routes use the `/api/v1` prefix

The readiness probe reports MongoDB and Redis state. Liveness intentionally has no external
dependency checks. Domain modules are scaffolds; add internal layers only as implementation needs
them, following `src/modules/README.md`.
