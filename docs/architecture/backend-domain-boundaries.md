# Backend domain boundaries

The executable context map is `apps/api/src/domains/domain-map.ts`. It lists, for every domain,
aggregate roots, entities, value objects, domain and integration events, commands, queries, repository
ports, policies, application services, and infrastructure adapters.

| Domain               | Owning Nest modules                                                  | Primary aggregate boundaries    |
| -------------------- | -------------------------------------------------------------------- | ------------------------------- |
| Identity and access  | auth, users, memberships, roles, permissions                         | User, AuthSession, Role         |
| Workspace management | workspaces, workspace-settings                                       | Workspace                       |
| CRM                  | contacts, companies, leads                                           | Contact, Company, Lead          |
| Sales                | deals, pipelines                                                     | Deal, Pipeline                  |
| Tasks and scheduling | tasks, calendar, appointments, availability, booking-links, services | Task, Appointment, BookingLink  |
| Messaging            | inbox, notifications                                                 | Conversation, OutboundMessage   |
| Marketing campaigns  | campaigns                                                            | Campaign, CampaignRun           |
| Workflow automation  | workflows                                                            | WorkflowDefinition, WorkflowRun |
| AI                   | agents                                                               | AgentConfiguration              |
| Knowledge management | knowledge-base, files                                                | KnowledgeBase, Document         |
| Billing              | billing                                                              | Subscription                    |
| Compliance           | consent, compliance, audit                                           | ConsentRecord, ComplianceCase   |
| Integrations         | integrations                                                         | IntegrationConnection           |
| Administration       | admin                                                                | PlatformConfiguration           |

## Dependency direction

Controllers depend on application services. Application services coordinate domain services,
repository ports, policies, and events. Repository implementations and provider/queue adapters are
infrastructure. Domain code does not import NestJS, Mongoose, BullMQ, Redis, HTTP, or provider SDKs.

Mongoose documents never cross a repository boundary as an API response. Repositories map persistence
records into domain objects or explicit application read models. A module can call another domain only
through its exported application service. Asynchronous collaboration uses versioned integration
events; consumers cannot directly update the producer's collections.

Three existing model-injecting classes are classified as repository infrastructure despite their
legacy names: the database migration runner, CRM event store, and privileged-access audit store.
Architecture tests keep this allowlist exact so new application services cannot inject models.

## Transactional boundaries

A command transaction is owned by one domain and one workspace. It may change multiple documents only
when they participate in the same invariant. Cross-domain database transactions are prohibited.
Details and the strong/eventual consistency classification are in ADR-006.

## Pragmatic use

CRUD services retain DTO validation, tenant-aware repositories, and response mappers. A new aggregate
is justified only by an invariant, lifecycle, concurrency rule, or atomic transition. The context map
describes the intended language and ports; it is not a mandate to create empty folders for every term.
