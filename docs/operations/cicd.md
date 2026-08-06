# CI/CD operations

Pull requests require the validation, frontend, API, worker, integration, E2E, accessibility, dependency-review, and security workflows. Protect `main`, require those checks, require review, prohibit force pushes, and restrict workflow-file changes through CODEOWNERS.

Configure GitHub environments named `staging`, `production`, and `release-approval`. Staging may deploy automatically after a successful SHA-tagged container build from protected `main`. Production and release environments must require reviewers; production should also restrict deployment to `main` or signed release tags. Define environment variables `API_URL` and `WEB_URL`, and a base64-encoded `KUBE_CONFIG` environment secret. Prefer replacing kubeconfig with GitHub OIDC and a short-lived cloud role when the cluster provider supports it.

Container images use the full commit SHA as the only deployment tag. Build jobs publish an SPDX SBOM, scan the pushed digest, create a provenance attestation, and keyless-sign the digest through GitHub OIDC. Deployment workflows never rebuild images.

API Helm upgrades run the migration hook before rolling out the API. Migrations must follow expand/migrate/contract compatibility. If a migration is not backward-compatible, do not use automated Helm rollback; deploy a reviewed forward fix or execute the migration's documented recovery procedure first.

## Rollback

1. Inspect `helm history amp-api`, `amp-worker`, and `amp-web` in the target namespace.
2. Confirm the selected revisions reference a known-good immutable SHA and are compatible with the current database schema.
3. Run the `Rollback deployment` workflow, select the protected environment, and enter each known-good revision.
4. Approve the GitHub environment gate. The workflow rolls back worker, API, then web and runs API/web smoke tests.
5. Verify queue age, error rate, database health, and business telemetry. Record the incident and block further automatic promotion until resolved.

GitHub secret names are references only. No actual credentials belong in workflow files, repository variables, build arguments, artifacts, logs, or Terraform inputs committed to source control.
