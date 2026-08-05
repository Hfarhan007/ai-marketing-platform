# Backend observability and security

The API emits structured Pino JSON with request, correlation, and W3C trace identifiers. Sensitive headers and nested credential fields are redacted. `GET /api/v1/metrics` exposes bounded-cardinality Prometheus metrics; set `METRICS_BEARER_TOKEN` and configure the scraper with the corresponding bearer token. Grafana should use Prometheus as its data source and alert on error rate, latency, dependency health, queue depth, AI cost/errors, integration errors, and security event rate.

`OpenTelemetryAdapter` and `SentryAdapter` are provider-neutral seams. At deployment startup, configure their SDK transports and propagate the returned `traceparent` through workers and outbound integration calls. Never put request bodies, credentials, authorization headers, cookies, or query strings in span attributes or Sentry contexts.

Liveness reports only process health. Readiness pings MongoDB and Redis and records their latency/availability. AI and integration dependencies should update `MetricsService.observeDependency` from their existing provider health checks; optional providers must not make the whole API unready.

## Network and HTTP controls

- `TRUST_PROXY=false` is safest. Otherwise provide an explicit comma-separated list of proxy IPs/CIDRs. Wildcard networks are rejected. Client IP is read only after Fastify applies this trust boundary.
- CORS matches configured origins exactly, allows credentials, and exposes only trace headers. Browser state-changing routes continue to require the existing CSRF token guard.
- Ordinary request bodies default to 1 MiB. Signed local upload URLs are exempt from that lower ceiling but remain bounded by `STORAGE_MAX_FILE_SIZE_BYTES`; storage validation also enforces media and upload policy.
- Helmet enables CSP, clickjacking denial, MIME sniffing protection, no-referrer policy, and production HSTS. Authentication cookies remain HTTP-only, same-site strict, and secure in production.
- Connector URL validation is mandatory for outbound requests and blocks private/link-local destinations unless explicitly authorized. Provider webhooks use raw-body signatures, timestamp windows, constant-time verification in adapters, and repository-backed event replay protection.

Run `pnpm security:dependencies` in CI with registry access and fail on high-severity production dependency findings. Rotate leaked credentials rather than relying on log redaction. Security events are structured for audit ingestion; configure alerts for replay, invalid signature, SSRF, rate-limit, and repeated-auth-failure events.
