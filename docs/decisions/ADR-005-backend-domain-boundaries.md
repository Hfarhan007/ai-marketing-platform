# ADR-005: Backend bounded contexts and pragmatic domain modeling

Status: Accepted

## Context

The API grew as NestJS feature modules. That structure provides useful technical isolation, but it does
not by itself establish ownership of data or safe cross-feature collaboration. Rewriting stable public
controllers would create risk without improving the invariants they protect.

## Decision

The backend uses fourteen bounded contexts defined in
`apps/api/src/domains/domain-map.ts`. Existing Nest modules remain deployment and composition units.
They are grouped beneath a domain boundary rather than renamed or recreated.

Domain objects are framework-independent TypeScript. Mongoose schemas are persistence records, not
domain models. Repositories own mapping between those representations and are the only module layer
allowed to inject Mongoose models. Controllers call application services and never repositories.

Aggregate roots are used when an operation protects a multi-step invariant:

- refresh-token families and authorization state;
- workspace membership and ownership;
- contact merge and lead conversion;
- deal and pipeline transitions;
- appointment reservation;
- conversation/message state;
- campaign lifecycle;
- published workflow versions and workflow runs;
- subscription lifecycle and entitlements;
- integration connection and webhook replay state.

Simple independent records remain validated CRUD. They do not receive artificial aggregates, command
buses, or value-object wrappers merely for structural symmetry.

Commands express intent and may mutate one owning domain. Queries are side-effect free. Cross-domain
work uses an exported application service for synchronous validation or a versioned integration event
for asynchronous reactions. A domain must never import another domain's schema or repository.

## Consequences

- Public REST behavior can remain stable while internals are extracted incrementally.
- Domain invariants are testable without NestJS, MongoDB, or BullMQ.
- Event consumers must be idempotent and integration events must be versioned.
- Some existing application services still combine orchestration and domain logic. They are migration
  points, not justification for a disruptive rewrite.
- Architecture tests and dependency-cruiser reject the most damaging boundary violations.
