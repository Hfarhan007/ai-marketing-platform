# Docker

The supported local entrypoint is the root `docker-compose.yml`.

- `mongodb/init-replica-set.js` initializes the replica set idempotently and waits for a primary.
- `redis/redis.conf` enables AOF and snapshot persistence with a no-eviction policy.
- `api`, `worker`, and `web` contain hot-reload images and non-secret development environment defaults.
- `scripts/init-minio.sh` creates the private local bucket idempotently.

The older infrastructure-only Compose file remains available for lightweight database workflows.
