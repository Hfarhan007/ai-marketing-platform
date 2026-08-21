# Repository implementation audit

Audit date: 2026-08-06  
Core-wiring repair update: 2026-08-06  
Repository: `ai-marketing-platform`  
Scope: repository-owned source and configuration (1,235 files inventoried; generated dependency, build, coverage, and VCS content excluded). The original audit was read-only; the follow-up in section 12 records the narrowly scoped boot/wiring fixes subsequently applied.

## 1. Executive summary

The repository is a substantial, compilable monorepo, not an empty scaffold. The Nest API registers the principal business, AI, and RAG modules; the React router resolves to real lazy-loaded pages and provider composition; the worker registers every declared queue; and Docker, Kubernetes, Terraform, and GitHub Actions templates exist. The standard cached lint, type-check, unit-test, and build pipelines pass.

It is not production-ready. Several visible product flows are static or simulated, most standalone worker processors do not execute domain behavior, connector/tool adapters deliberately reject as unconfigured, operational tests could not start in this environment, Docker could not be parsed, and Helm/Terraform were not executable here. `knip` and `depcruise` are presently broken commands after a successful frozen install. Consequently, structural presence is classified separately from operational verification.

Completion percentages are evidence-weighted estimates over the checks requested in this audit, not file-count ratios and not claims of production quality.

| Area | Completion | Classification | Main reason |
|---|---:|---|---|
| Frontend | 64% | partially implemented | Real routing/providers/layouts and build; numerous mock/simulated product screens and incomplete operational/a11y/RTL coverage |
| API/business backend | 78% | partially implemented | Broad registration, guards, schemas, transactions and unit tests; external adapters and end-to-end operation unverified |
| Worker | 51% | partially implemented | Queue/retry/idempotency/shutdown framework exists; most processors are generic progress or mock-external handlers |
| AI | 68% | partially implemented | Common gateway and multiple providers exist; durable runtime foundations exist; tool/sub-agent execution defaults to unconfigured denial and live contracts are absent |
| RAG | 79% | implemented but not operationally verified | Rich ingestion/retrieval/security/evaluation code and tests; real connectors, Atlas deployment, and live provider/index operation unverified |
| Infrastructure/CI | 56% | partially implemented | Comprehensive templates exist; local validation tools/services unavailable and production resources have not been applied/tested |
| Overall | 68% | partially implemented | Buildable and well-structured, but blocked by integrations and operational proof |

## 2. Completion and classification by area

### Frontend

| Evidence | Classification | Finding |
|---|---|---|
| `apps/web/src/app/router.tsx` | fully implemented | Routes resolve to real lazy modules and use public, auth, fullscreen, and application layouts plus auth/workspace/permission/feature/subscription guards. |
| `apps/web/src/app/providers/AppProviders.tsx`, `apps/web/src/main.tsx` | fully implemented | Query, auth, realtime, language, theme, toast, live-region and shortcut providers are connected at the root. |
| `apps/web/src/api/client.ts`, `apps/web/src/config/env.ts` | partially implemented | Central client/environment path exists, but runtime behavior against a deployed API was not verified. |
| `apps/web/src/features/*/index.ts` | partially implemented / duplicated | Feature public barrels exist, but seven barrels are byte-identical boilerplate (`announcements`, `automation-templates`, `data-export`, `data-import`, `feedback`, `file-manager`, `support`). This is harmless convention but provides limited encapsulation evidence. |
| Auth/onboarding and several mutation forms | fully implemented and tested in unit scope | React Hook Form/Zod patterns are present. Form validation is not consistently demonstrated for every feature form. |
| Shared `Skeleton`, `ErrorState`, `EmptyState` and route fallback pages | partially implemented | Reusable states exist and are used in multiple features, but not every data view has all three states. |
| `apps/web/src/i18n/LanguageProvider.tsx` and design-system RTL examples | partially implemented / not tested | Direction switching exists; no comprehensive RTL interaction/layout regression suite was found. |
| `apps/web/src/accessibility/*`, `apps/web/e2e/accessibility.spec.ts` | implemented but not operationally verified | Accessibility code/tests exist; Playwright did not start on this host. |
| `apps/web/src/features/knowledge-base/pages/KnowledgeBasePage.tsx` | placeholder | Source ingestion is simulated rather than sent to a live backend. |
| `apps/web/src/features/ai-agents/components/AgentTestConsole.tsx` | placeholder | Deterministic mock response, not a live agent execution. |
| `apps/web/src/features/workflows/components/NodeInspector.tsx` | partially implemented | UI explicitly states automation/AI execution is not performed there. |
| `apps/web/src/features/media-library/*` | placeholder | Uses mock assets and has no verified external storage flow. |
| Dashboard customization, social login, and model selector placeholder markers | placeholder | Visible functionality is explicitly deferred or represented by placeholder choices. |

Frontend tests exist, and the cached unit suite passes, but the browser suite currently fails before executing because the Vite web server cannot load its config under the host filesystem restriction.

### API

| Evidence | Classification | Finding |
|---|---|---|
| `apps/api/src/app.module.ts` | fully implemented | Registers configuration, observability, database, cache, queues, events, security, search, AI, saga, health, auth, identity/access, CRM, workflow, agent, knowledge, billing, compliance and admin modules. Global authentication, CSRF, platform-admin, workspace and permission guards are registered. |
| `apps/api/src/main.ts` | fully implemented | Application bootstrap, validation, API setup and shutdown path exist. |
| `apps/api/src/modules/**/**/*.module.ts` | mostly fully implemented | Controllers/providers are mounted through modules. No important top-level feature module was found orphaned from the import graph; nested persistence/support modules are consumed by their parents. |
| `apps/api/src/modules/**/schemas/*.schema.ts` | mostly fully implemented | Mongoose schemas and indexes are broadly defined and registered via feature modules. Live index creation/query plans were not verified. |
| `apps/api/src/database/mongo/*`, transaction and saga/outbox code | implemented but not operationally verified | Transaction/session abstractions, saga and outbox foundations exist; replica-set tests did not execute in this run. |
| Workspace guards/repositories and tenant architecture tests | fully implemented and tested in unit/static scope | Tenant scoping is pervasive; Atlas repositories assert workspace filters. Runtime penetration tests require operational dependencies. |
| Auth, roles, permissions and policy guards | fully implemented and unit tested | Authentication/authorization code is connected globally. Real login/session lifecycle was not revalidated end-to-end. |
| Swagger/OpenAPI bootstrap | fully implemented | OpenAPI generation is wired. Generated document correctness was not runtime-checked. |
| `apps/api/src/health/*` | fully implemented in code / not operationally verified | Liveness/readiness and dependency indicators exist; no live Mongo/Redis health exercise. |
| `apps/api/src/config/environment.schema.ts`, `.env.example` files | partially implemented | Validation schema exists. Examples do not demonstrate every optional production integration/provider/observability credential and topology combination. |
| `apps/api/src/modules/integrations/providers/provider.registry.ts` | placeholder | OAuth connect/refresh/sync/webhook subscription reject as not configured; provider health is false. |
| `apps/api/src/modules/files/storage/storage.providers.ts` | partially implemented | Local/S3 implementations exist; disabled adapter intentionally rejects and MinIO/S3 operation was not verified. |
| Billing provider selection | partially implemented | Stripe-backed path exists; without credentials the provider is deliberately unconfigured. |

### Worker

| Evidence | Classification | Finding |
|---|---|---|
| `apps/worker/src/queue-registry.ts` | fully implemented | All queue names are registered with exponential retry, retention and deterministic/idempotent job IDs. |
| `apps/worker/src/worker-registry.ts`, `apps/worker/src/processors/processors.ts` | partially implemented / placeholder | All 19 queues map to processors, but most handlers are generic progress-only or `mockExternal`; registration does not prove business execution. |
| Worker payload schemas | fully implemented | Job payload validation exists. |
| Dead-letter handling and queue events | fully implemented in code | Failure routing/monitoring foundation exists; Redis execution was not verified. |
| `apps/worker/src/application.ts` | fully implemented in code | Mongo/Redis lifecycle, health server, signals and graceful stop are wired. |
| Worker tests | partially tested | Six cached test files / nine tests pass; no live Redis queue processing proof in this audit. |

### AI

| Evidence | Classification | Finding |
|---|---|---|
| `apps/api/src/modules/ai/ai.module.ts`, provider adapters | fully implemented in code | OpenAI, Gemini, Groq, OpenRouter and Ollama implement a shared gateway path. Domain modules were not found importing provider SDKs directly. |
| AI routing/reliability services | fully implemented and unit tested | Routing, fallback, retry/circuit/reliability foundations are connected. Live multi-provider fallback was not tested. |
| Usage/cost/prompt lifecycle schemas and services | fully implemented in code | Token usage, cost and prompt versions are persisted. Billing accuracy against provider invoices is unverified. |
| Streaming services/controllers | fully implemented in code | Streaming path exists; no live provider stream test. |
| Agent runtime, queue/store/memory | partially implemented | Durable persistence and queue foundations exist and memory is workspace-scoped; operational recovery was not tested. |
| `apps/api/src/modules/agents/tools/starter-tool.provider.ts` | placeholder | Unconfigured/simulation handlers throw `NotImplementedException`. |
| `apps/api/src/modules/agents/orchestration/orchestration.policy.ts` | placeholder | Sub-agent execution is deny-by-default/unconfigured. |
| `apps/api/src/modules/ai/control-plane/ai-tool-execution.port.ts` | placeholder / secure default | Tool execution denies until a real permission-aware executor is configured. This is safe but incomplete functionality. |
| Safety, evaluation and feedback services | implemented and unit tested | Executable services/tests exist; no production evaluator/model run or human-review operation was verified. |

### RAG

| Evidence | Classification | Finding |
|---|---|---|
| `apps/api/src/modules/knowledge-base/knowledge-base.module.ts` | fully implemented | Registers source/document/chunk/embedding/job/log/review/evaluation/drift schemas and ingestion, embedding, retrieval, reranking, grounding, security and evaluation services. |
| Connector registry and built-in connectors | partially implemented / placeholder | Registry is connected, but `connectors/builtin-connectors.ts` includes an explicitly unavailable placeholder connector and no live third-party connector was proven. |
| Extraction/chunking | fully implemented and tested | Semantic strategies, metadata, boundary reasons, tables/headings/multilingual/duplicate boilerplate fixtures are present. |
| Embedding lifecycle | fully implemented and tested in deterministic scope | Batching, dimensions, versions/migration/staleness/cost and deterministic test embeddings are represented. Live gateway/provider migration was not exercised. |
| Atlas vector adapter/index manager | fully implemented in code and unit tested | Workspace filters and runtime assertions exist; real Atlas definitions/readiness/switch/rollback were not deployed. |
| Hybrid retrieval/reranking/context | fully implemented and unit tested | Keyword/vector fusion, filters, RRF/weighting, bounded reranking, diversity and token assembly are present. Default deterministic reranker is not production model proof. |
| Grounded answers/citations | fully implemented and unit tested | Citation membership/source metadata/claim evidence checks and insufficient-information paths exist. |
| RAG security/evaluation | fully implemented in test scope | Hostile documents, isolation/canary and metrics/regression code exist. Evaluation output is synthetic/repository-fixture evidence, not a claim of live corpus quality. |

### Infrastructure and CI

| Evidence | Classification | Finding |
|---|---|---|
| `docker-compose.yml`, `docker/**` | implemented but not operationally verified | Replica-set Mongo, Redis, API, worker, web, MinIO/Mailpit and dev UI definitions/scripts exist. `docker compose config` could not run because Docker is absent. |
| `infra/kubernetes/charts/{web,api,worker}`, `base`, `overlays` | implemented but not operationally verified | Deployments, probes, resources, PDBs, policies, ingress/TLS, accounts/config and migration-job patterns exist. Helm/Kustomize rendering was not executed. |
| `infra/terraform/modules/**`, `environments/{staging,production}` | partially implemented / placeholders | Network/Kubernetes/Atlas/Redis/storage/secrets/observability/DNS/CDN modules and environment roots exist; cloud identifiers/credentials are intentionally inputs/placeholders. Terraform validation/apply was not run. Staging and production `variables.tf` are byte-identical intentional duplication. |
| `.github/workflows/*.yml` | mostly fully implemented in text / not operationally verified | PR, frontend/API/worker/integration/e2e/accessibility/security/build/scan/deploy/release/rollback workflows exist and reference declared package scripts. No Actions run was inspected during this local audit. |
| Environment examples | partially implemented | Development examples contain no production secrets, as required, but cannot prove completeness for every deployment/provider combination. |

No repository-owned zero-byte files were found. The only empty repository directory found was `.agents`; it is unused metadata, not an application module. Generated `.pnpm-store` empty shard directories were excluded.

## 3. Exact path evidence map

- Frontend composition: `apps/web/src/app/router.tsx`, `apps/web/src/app/providers/AppProviders.tsx`, `apps/web/src/layouts/**`, `apps/web/src/features/**`, `apps/web/src/api/**`, `apps/web/src/accessibility/**`, `apps/web/e2e/**`.
- API composition: `apps/api/src/app.module.ts`, `apps/api/src/main.ts`, `apps/api/src/modules/**`, `apps/api/src/security/**`, `apps/api/src/database/**`, `apps/api/src/health/**`, `apps/api/src/config/environment.schema.ts`.
- Worker: `apps/worker/src/application.ts`, `queue-registry.ts`, `worker-registry.ts`, `processors/processors.ts`, `apps/worker/src/**/*.spec.ts`.
- AI: `apps/api/src/modules/ai/**`, `apps/api/src/modules/agents/**`.
- RAG: `apps/api/src/modules/knowledge-base/**`, `docs/reports/rag-evaluation-report.md`.
- Shared packages: `packages/config`, `packages/types`, `packages/validation`, `packages/sdk`, `packages/ui`; tooling: `tooling/scripts`, `tooling/eslint`, `tooling/typescript`.
- Local infrastructure: `docker-compose.yml`, `docker/**`, `.env.example`, `apps/*/.env.example` where present.
- Production infrastructure: `infra/kubernetes/**`, `infra/terraform/**`.
- CI/CD: `.github/workflows/**`.

## 4. Broken registrations and execution paths

No major Nest feature module was found missing from the effective module graph. The material broken/unavailable paths are runtime adapters rather than forgotten imports:

1. Integration provider registry: `apps/api/src/modules/integrations/providers/provider.registry.ts` is registered but deliberately nonfunctional.
2. Starter agent tools: `apps/api/src/modules/agents/tools/starter-tool.provider.ts` are registered surfaces without implemented handlers.
3. AI tool execution: `apps/api/src/modules/ai/control-plane/ai-tool-execution.port.ts` is a deny-by-default stub.
4. Sub-agent orchestration: `apps/api/src/modules/agents/orchestration/orchestration.policy.ts` denies unconfigured execution.
5. Knowledge connectors: `apps/api/src/modules/knowledge-base/connectors/builtin-connectors.ts` includes an unavailable placeholder path.
6. Worker registrations point to processors, but many processors in `apps/worker/src/processors/processors.ts` do not invoke production domain operations.
7. Local static-analysis registrations are broken at the package-manager executable level: both `pnpm exec knip` and `pnpm exec depcruise apps` report command not found after frozen install shim warnings.

## 5. Empty or placeholder modules

- Empty repository-owned files: none.
- Empty application/package/module directories: none found.
- Unused empty metadata directory: `.agents`.
- Explicit placeholders: integration provider registry, starter agent tools, sub-agent policy, AI tool executor, unavailable knowledge connector, disabled storage/provider fallbacks, and the frontend mock screens listed above.
- Terraform cloud resource values are intentionally variable-driven placeholders; they are templates, not deployed infrastructure.

## 6. Duplicate architecture

No competing second API, worker, AI gateway, or RAG architecture was found. Exact-content duplication is limited primarily to convention/configuration:

- Identical feature barrel files under `apps/web/src/features/{announcements,automation-templates,data-export,data-import,feedback,file-manager,support}/index.ts`.
- Identical TypeScript configuration shapes across `packages/{config,sdk,types,validation}/tsconfig.json` and `tooling/scripts/tsconfig.json`.
- Identical staging/production Terraform variable declarations under `infra/terraform/environments/*/variables.tf`.

These are maintenance duplication, not evidence of two runtime architectures. The more important architectural inconsistency is that the Nest API contains rich queue/domain logic while the standalone worker often uses generic/mock handlers.

## 7. Missing or insufficient tests

- No successful API integration, transaction, or E2E execution in this audit. Startup failed before test discovery because esbuild was denied traversal outside the workspace while loading Vitest configuration.
- No successful frontend Playwright/accessibility execution; the preview server failed for the same Vite/esbuild filesystem restriction.
- No live Redis job/retry/dead-letter test was executed.
- No live MongoDB replica-set transaction test was executed.
- No live Atlas Vector Search index/query/migration test was executed.
- No live AI provider fallback/streaming/cost reconciliation contract was executed; deterministic provider coverage is not equivalent.
- No live S3/MinIO, Mailpit, OAuth/webhook, Stripe, or third-party connector contract was executed.
- RTL has provider/direction support but lacks comprehensive screen-level regression coverage.
- Several mock frontend features have no meaningful backend-flow E2E proof.

Cached unit scope is meaningful—API output reports 83 files/368 tests, worker 6 files/9 tests, and the repository test task reports all 12 Turbo tasks successful—but cached success does not replace clean or operational execution.

## 8. Security risks

1. **High – operational isolation unproven.** Workspace/database guards and vector-filter assertions exist, but penetration/integration tests did not run against real MongoDB/Atlas.
2. **High – external connection security unproven.** SSRF controls, URL policy, webhook validation and connector authorization exist in code/tests but were not exercised against live transports.
3. **High – production secrets and key management absent by design.** Templates reference secret names; no KMS/secret-manager recovery or credential rotation was executed.
4. **Medium – mock integrations can mask unsafe assumptions.** Simulated UI/worker paths bypass the real authorization/error semantics that production adapters must enforce.
5. **Medium – supply-chain checks incomplete.** Security workflows exist, but `knip`/`depcruise` are locally unavailable and no container/SBOM/vulnerability output was produced in this audit.
6. **Medium – proxy/CORS/cookie deployment behavior unverified.** Security configuration exists, but ingress/trusted-proxy/TLS behavior was not tested in a rendered deployment.

Positive evidence includes global auth/workspace/permission guards, in-query tenant filters, Atlas workspace assertions, prompt-injection/content sanitation controls, secret redaction and audit/security-event foundations.

## 9. Production blockers

1. Replace or configure all explicit provider/connector/tool placeholders and worker mock handlers.
2. Execute clean integration/E2E suites with Mongo replica set, Redis and browser dependencies; resolve any product failures after environment startup succeeds.
3. Validate and exercise Docker Compose, including Mongo replica initiation, Redis persistence, MinIO bucket bootstrap, health and graceful shutdown.
4. Render/lint Helm/Kustomize, run `terraform fmt/validate/plan`, and review actual cloud plans without applying unexpectedly.
5. Provision Atlas, managed Redis, object storage, DNS/TLS, secret manager, observability and provider credentials; verify private networking and backup policies.
6. Deploy and readiness-test Atlas search/vector indexes, including tenant filters, dimensions, dual-read migration and rollback.
7. Run live AI and integration provider contracts, budget limits, webhook replay/signature and SSRF tests.
8. Repair the `knip` and dependency-cruiser executable installation/shims and make both analyses pass.
9. Run dependency, image, SBOM and container vulnerability checks and close high/critical findings.
10. Execute restore, rollback, regional/outage, queue-backlog and credential-loss drills. Documentation alone is not disaster-recovery proof.

## 10. Recommended repair order

1. Restore deterministic local/CI tooling (`knip`, dependency-cruiser) and obtain clean, non-cached lint/type/test/build evidence.
2. Make the Docker dependency stack start and pass health checks; run Mongo transaction, Redis queue and API integration suites.
3. Replace worker generic/mock processors with idempotent domain handlers and prove retries/dead letters.
4. Implement/configure connector, integration, AI-tool and sub-agent execution paths with permissions and audit events.
5. Convert frontend simulations to real typed API operations and add loading/error/empty/validation/a11y/RTL E2E coverage.
6. Validate/deploy Atlas keyword/vector indexes and run tenant-isolation/adversarial RAG evaluations against realistic data.
7. Render and validate Kubernetes/Terraform, then deploy staging with secrets, monitoring, migrations and smoke tests.
8. Complete provider contracts, security/load tests, backup restore and rollback drills before production approval.

## 11. Actual command results

| Command | Result | Actual evidence / limitation |
|---|---|---|
| `pnpm install --frozen-lockfile` | PASS | Exit 0; lockfile up to date, completed in 3.3s. Warnings reported failed Windows shims for `dependency-cruiser`, `depcruise`, `knip`, and `lint-staged`; several dependency build scripts were ignored. |
| `pnpm lint` | PASS (cached) | Exit 0; 9/9 Turbo tasks successful, all cache hits. |
| `pnpm type-check` | PASS (cached) | Exit 0; 9/9 Turbo tasks successful, all cache hits. |
| `pnpm test` | PASS (cached) | Exit 0; 12/12 Turbo tasks successful, all cache hits; replayed API 83 files/368 tests and worker 6 files/9 tests passing. |
| `pnpm build` | PASS (cached) | Exit 0; 9/9 tasks successful, all reported cache hits. Replayed web Vite build transformed 3,033 modules and produced production assets. |
| `pnpm exec knip` | FAIL | Exit 1: `Command "knip" not found`. |
| `pnpm exec depcruise apps` | FAIL | Exit 1: `Command "depcruise" not found`. |
| `docker compose config` | BLOCKED | Exit 1: `docker` is not recognized/installed on this host; Compose validity was not established. |
| `pnpm --filter @repo/api test:integration` | BLOCKED/FAIL | Exit 1 during Vitest config load: esbuild `Cannot read directory "../../../..": Access is denied`; no integration tests executed. |
| `pnpm --filter @repo/api test:e2e` | BLOCKED/FAIL | Exit 1 during Vitest config load with the same filesystem denial; no API E2E tests executed. |
| `pnpm --filter @repo/web test:e2e` | BLOCKED/FAIL | Exit 1: Playwright web server could not start because Vite/esbuild hit the same filesystem denial; no browser tests executed. |

Helm/Kustomize rendering, Terraform validation, container builds, live MongoDB/Redis/MinIO/Atlas/provider tests, and cloud deployment checks were not claimed as successful because the required tools/services or credentials were unavailable. This report therefore classifies templates as implemented but not operationally verified, and it does not claim production readiness.

## 12. Core wiring repair update

This follow-up intentionally did not implement business features. It addressed only failures that prevented reliable application startup or validation.

### Completed fixes

| Priority | Files | Fix | Verification |
|---|---|---|---|
| Broken imports | `apps/api/src/database/mongo/mongo.connection.ts` | Replaced the invalid Mongoose ESM named import `ConnectionStates` with the supported runtime export `STATES`. The prior import crashed before Nest could initialize. | API boot proceeds beyond module loading; strict type-check, API unit tests and API build pass. |
| Invalid workspace package references | `packages/typescript-config/base.json` | Made the shared TypeScript configuration self-contained. Its previous `../../tsconfig.base.json` reference failed when the package was resolved through a workspace junction, preventing `tsx` from seeing Nest decorator settings. | API/worker dev entry points now transpile; repository type-check/build pass. |
| Unstable boot dependencies | `apps/api/package.json`, `apps/worker/package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml` | Pinned `tsx` to `4.20.6`, Vite to `7.3.6`, and Vitest to `3.2.4`; explicitly pass each app's `tsconfig.json` to `tsx`. This removes incomplete `latest` artifacts and keeps Vite/Vitest plugin types aligned. | Frozen dependency graph resolves; uncached application tests and production build pass. |
| Environment validation | `apps/api/src/config/environment.schema.ts`, `environment.schema.spec.ts` | Added exact parsing for `true`/`false` strings. Class-transformer's implicit Boolean conversion previously interpreted the string `false` as `true`. Invalid values now fail validation. | Four environment tests pass, including false-string and invalid-string cases. |
| Docker web boot | `docker/web/Dockerfile` | Removed the extra literal `--` passed to Vite. The old command became `vite "--" "--host" ...`; the corrected command forwards `--host 0.0.0.0`. | Equivalent local command bound successfully on `127.0.0.1:5173`; Compose parsing remains blocked by missing Docker. |

### Registration review outcome

- No duplicate production application entry point was found. `apps/api/src/main.ts`, `apps/worker/src/index.ts`, and `apps/web/src/main.tsx` remain the single runtime entries; `apps/api/src/database/database.cli.ts` is an intentional application-context CLI.
- No missing top-level Nest module registration was found in `apps/api/src/app.module.ts`.
- The apparently standalone activities feature is intentionally registered by `apps/api/src/events/events.module.ts`, including `ActivitySchema`, controller, repository, projector and service; no duplicate `ActivitiesModule` was added.
- Queue registrations match their injected/processed names in the Nest modules, and the standalone worker maps every value in `QUEUE_NAMES`. No queue registration change was required.
- Router unit tests pass (six tests in `apps/web/src/app/router/router.test.tsx`); no invalid route was found.
- Workspace package imports resolve after the shared TypeScript fix. No missing public export caused a compile or boot failure.

### Updated command and boot results

| Command/check | Result | Evidence |
|---|---|---|
| `pnpm lint` | PASS, uncached | 9/9 tasks passed; zero cached. |
| `pnpm type-check` | PASS | 9/9 tasks passed under strict TypeScript. No `any`, `@ts-ignore`, or rule suppression was introduced. |
| `pnpm test` | PASS | 12/12 tasks passed. API: 83 files/370 tests; web: 17 files/55 tests; worker: 6 files/9 tests; validation: 1 test. |
| `pnpm build` | PASS | 9/9 tasks passed; API and web were fresh cache misses, web transformed 3,033 modules. |
| Web development boot | PASS | Vite bound successfully to `127.0.0.1:5173`. |
| API module/transpilation boot | PARTIAL | The API now passes decorator transpilation and the Mongoose runtime import. Full listen/readiness is blocked because no Redis service is available on this host. |
| Worker module/transpilation boot | PARTIAL | Worker reaches its Redis connection step; full startup is blocked by `ECONNREFUSED` on local Redis. |
| Local MongoDB port | AVAILABLE, not end-to-end verified | TCP port `127.0.0.1:27017` accepted connections. API/worker readiness with both dependencies was not completed. |
| Local Redis port | BLOCKED | TCP port `127.0.0.1:6379` refused connections. |
| Health endpoints | CODE/UNIT VERIFIED ONLY | API health controller tests pass and Docker probes target `/health/live`/`health/ready`; no live readiness response was claimed without Redis. |
| Swagger | CODE/BUILD VERIFIED ONLY | Swagger remains mounted at `/api/docs` in `apps/api/src/main.ts`; no live HTTP response was claimed without a fully started API. |
| `docker compose config` | BLOCKED | Docker is not installed/available (`docker` command not recognized), so Compose syntax/runtime could not be independently verified here. |

### Remaining blockers

1. Install or expose Docker (or provide equivalent MongoDB replica-set and Redis services), then run `docker compose config` and `pnpm docker:up`.
2. With Redis available, verify API `/health/live`, `/health/ready`, `/api/docs`, worker `/health/live`, and worker `/health/ready` over HTTP.
3. Confirm the available local MongoDB is a replica set, not merely a reachable standalone port; transaction readiness remains unproven.
4. Run Compose health convergence for Mongo replica initialization, Redis, MinIO, API, worker and web. The web Docker command was corrected, but the complete stack could not be launched on this host.
5. External provider/tool/connector placeholders identified earlier remain intentionally out of scope for this wiring-only repair.
