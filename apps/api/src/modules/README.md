# Business module convention

Each domain begins as an empty Nest module so domain behavior is not fabricated during scaffolding.
As behavior is implemented, place it in the following folders:

- `controllers/` — transport only; validated DTOs in and mapped responses out
- `services/` — application use cases and transaction boundaries
- `repositories/` — tenant-scoped persistence
- `schemas/` — Mongoose schemas and indexes
- `dto/` — class-validator request DTOs and explicit response DTOs
- `mappers/` — MongoDB document to response/domain mapping
- `policies/` — backend authorization and tenant policies
- `events/` and `listeners/` — domain events and handlers
- `jobs/` — idempotent BullMQ producers/processors
- `tests/` — module unit and integration tests

Folders are added to a module only when it gains that responsibility.
