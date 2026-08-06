# Production infrastructure templates

These templates are reviewable starting points, not an automatic deployment system. No command in this repository runs `terraform apply` or upgrades a Helm release. Pin image digests, review plans, obtain approval, and deploy through the environment's controlled CI identity.

## Terraform

AWS is the reference runtime: EKS, ElastiCache Redis, S3, CloudWatch, Route 53, and CloudFront. MongoDB Atlas is managed separately through its Terraform provider. Staging and production have independent roots and must use independent accounts/projects where practical.

Remote state is mandatory. Create the state infrastructure before `terraform init`: a versioned, encrypted S3 bucket with public access blocked, a DynamoDB lock table (or the current Terraform S3 lockfile mechanism), narrowly scoped CI access, audit logging, and separate state keys per environment. Initialize without committing backend credentials:

```bash
terraform -chdir=infra/terraform/environments/staging init \
  -backend-config="bucket=YOUR_STATE_BUCKET" \
  -backend-config="key=amp/staging/terraform.tfstate" \
  -backend-config="region=us-east-1" \
  -backend-config="encrypt=true" \
  -backend-config="use_lockfile=true"
terraform -chdir=infra/terraform/environments/staging plan
```

Provider credentials, Atlas keys, database passwords, and application secrets come from workload identity or protected CI variables. The secrets module creates secret containers only; secret versions are populated by an approved external process so plaintext values are not embedded in configuration. Sensitive Terraform variables still enter state when a provider requires them, so state access and encryption are security boundaries.

The Atlas module creates a project, replica-set cluster, scoped database user, backup configuration, and explicit network access entries. Replace CIDR access with Atlas PrivateLink before production. The implementation sequence is: create `mongodbatlas_privatelink_endpoint`, create the cloud interface endpoint using its service name, then attach it with `mongodbatlas_privatelink_endpoint_service`. Keep the endpoint and EKS nodes in the private subnets and remove public CIDRs after verification.

Atlas Vector Search indexes are application-versioned and deployed by the repository's existing vector-index deployment command after the cluster is reachable. Terraform should own the Atlas project/cluster lifecycle; application migration tooling should own index definitions, readiness checks, dual-read transitions, and rollback. Do not switch index versions until readiness and retrieval evaluation gates pass.

## Kubernetes and Helm

Charts exist for web, API, and worker. Render them before deployment:

```bash
helm lint infra/kubernetes/charts/api
helm template amp-api infra/kubernetes/charts/api -f infra/kubernetes/overlays/staging/api-values.yaml
kubectl kustomize infra/kubernetes/overlays/staging
```

Install External Secrets, cert-manager, an ingress controller, metrics-server, and an external-metrics adapter before workloads. `amp-runtime-secrets` is a reference to an external store, never a committed Secret. Network policies assume namespaces for ingress and monitoring are labeled with their names; adapt egress rules to the selected DNS resolver and private endpoints.

Worker scaling uses the external metric `bullmq_waiting_jobs` and a stabilization window. Export queue depth by queue, configure the metrics adapter, cap concurrency per pod, and ensure jobs are idempotent before increasing replicas. Include active-job age, failure rate, Redis saturation, and downstream API quotas in scaling alerts. During termination, the worker receives 60 seconds to stop accepting work and finish or safely return jobs.

The migration Job is a Helm pre-install/pre-upgrade hook with bounded retries and duration. Backward-compatible expand/migrate/contract database changes are required for zero-downtime rolling updates. Treat destructive migrations as separate, explicitly approved releases.

## Backup and disaster recovery

Recovery objectives, backup controls, incident runbooks, drill evidence requirements, and the post-incident template are maintained in [the disaster-recovery guide](../docs/operations/disaster-recovery/README.md). The Terraform modules express baseline Atlas backup retention and versioned object-storage controls, but those declarations do not prove recoverability. Keep DR status unverified until an isolated restore drill has produced reviewed evidence.
