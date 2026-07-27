# Migration scripts

Export ordered `Migration` objects from this folder. Versioned migrations run once. Repeatable
migrations run again only when their required checksum changes. Migration code must be additive,
idempotent where practical, and must never drop collections or indexes implicitly.
